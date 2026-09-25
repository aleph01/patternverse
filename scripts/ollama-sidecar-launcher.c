#include <errno.h>
#include <limits.h>
#include <mach-o/dyld.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

static volatile sig_atomic_t stop_requested = 0;

static void request_stop(int signal_number) {
  (void)signal_number;
  stop_requested = 1;
}

static int executable_directory(char *directory, size_t capacity) {
  char executable[PATH_MAX];
  uint32_t size = sizeof(executable);
  if (_NSGetExecutablePath(executable, &size) != 0) return -1;
  char resolved[PATH_MAX];
  if (realpath(executable, resolved) == NULL) return -1;
  char *separator = strrchr(resolved, '/');
  if (separator == NULL) return -1;
  *separator = '\0';
  if (strlen(resolved) + 1 > capacity) return -1;
  memcpy(directory, resolved, strlen(resolved) + 1);
  return 0;
}

static int find_runtime(char *runtime, size_t capacity) {
  char directory[PATH_MAX];
  if (executable_directory(directory, sizeof(directory)) != 0) return -1;
  const char *relative_paths[] = {
      "ollama-runtime/dist/darwin/ollama",
      "binaries/ollama-runtime/dist/darwin/ollama",
      "../Resources/binaries/ollama-runtime/dist/darwin/ollama",
  };
  for (size_t index = 0; index < sizeof(relative_paths) / sizeof(relative_paths[0]); index++) {
    int written = snprintf(runtime, capacity, "%s/%s", directory, relative_paths[index]);
    if (written > 0 && (size_t)written < capacity && access(runtime, X_OK) == 0) return 0;
  }
  return -1;
}

static int wait_for_child(pid_t child, int *status, unsigned attempts) {
  for (unsigned attempt = 0; attempt < attempts; attempt++) {
    pid_t result = waitpid(child, status, WNOHANG);
    if (result == child) return 1;
    if (result < 0 && errno != EINTR) return -1;
    usleep(50000);
  }
  return 0;
}

static int supervise_runtime(pid_t app_pid, pid_t wrapper_pid, const char *runtime, int argc, char **argv) {
  pid_t child = fork();
  if (child < 0) return 1;
  if (child == 0) {
    char **runtime_arguments = calloc((size_t)argc + 1, sizeof(char *));
    if (runtime_arguments == NULL) _exit(1);
    runtime_arguments[0] = (char *)runtime;
    for (int index = 1; index < argc; index++) runtime_arguments[index] = argv[index];
    execv(runtime, runtime_arguments);
    _exit(1);
  }

  int status = 0;
  for (;;) {
    int finished = wait_for_child(child, &status, 1);
    if (finished == 1) break;
    if (finished < 0) return 1;
    if (stop_requested || getppid() != wrapper_pid || kill(app_pid, 0) != 0) {
      kill(child, SIGTERM);
      if (wait_for_child(child, &status, 80) == 0) {
        kill(child, SIGKILL);
        while (waitpid(child, &status, 0) < 0 && errno == EINTR) {}
      }
      break;
    }
    usleep(950000);
  }
  if (WIFEXITED(status)) return WEXITSTATUS(status);
  if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
  return 1;
}

int main(int argc, char **argv) {
  char runtime[PATH_MAX];
  if (find_runtime(runtime, sizeof(runtime)) != 0) {
    fputs("Patternverse's bundled conversation runtime is missing.\n", stderr);
    return 1;
  }
  signal(SIGINT, request_stop);
  signal(SIGTERM, request_stop);
  pid_t app_pid = getppid();
  pid_t wrapper_pid = getpid();
  pid_t supervisor = fork();
  if (supervisor < 0) return 1;
  if (supervisor == 0) return supervise_runtime(app_pid, wrapper_pid, runtime, argc, argv);

  int status = 0;
  while (waitpid(supervisor, &status, 0) < 0) {
    if (errno != EINTR) return 1;
    if (stop_requested) kill(supervisor, SIGTERM);
  }
  if (WIFEXITED(status)) return WEXITSTATUS(status);
  if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
  return 1;
}
