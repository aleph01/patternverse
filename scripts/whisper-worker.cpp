// Private pipe protocol: one JSON request per line, no listening socket or transcript logs.
// Built against the same pinned whisper.cpp source and model as the original CLI.
#include "common.h"
#include "common-whisper.h"
#include "whisper.h"
#include "json.hpp"
#include <algorithm>
#include <fstream>
#include <iostream>
#include <thread>

int main(int argc, char ** argv) {
    if (argc != 3 || std::string(argv[1]) != "-m") return 1;
    auto cparams = whisper_context_default_params();
    cparams.use_gpu = true;
    cparams.flash_attn = true;
    auto * ctx = whisper_init_from_file_with_params(argv[2], cparams);
    if (!ctx) return 2;
    std::string line;
    while (std::getline(std::cin, line)) {
        try {
            const auto request = nlohmann::json::parse(line);
            const auto language = request.at("language").get<std::string>();
            const auto input = request.at("input").get<std::string>();
            const auto output = request.at("output").get<std::string>();
            if (language != "auto" && whisper_lang_id(language.c_str()) < 0) throw std::runtime_error("language");
            std::vector<float> pcm;
            std::vector<std::vector<float>> stereo;
            if (!read_audio_data(input, pcm, stereo, false)) throw std::runtime_error("audio");
            // Match CLI defaults, including beam search, fallback and non-speech suppression.
            auto params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
            params.beam_search.beam_size = whisper_full_default_params(WHISPER_SAMPLING_BEAM_SEARCH).beam_search.beam_size;
            params.strategy = params.beam_search.beam_size > 1 ? WHISPER_SAMPLING_BEAM_SEARCH : WHISPER_SAMPLING_GREEDY;
            params.n_threads = std::max(1, std::min(4, (int) std::thread::hardware_concurrency()));
            params.language = language.c_str();
            params.no_context = true; // Never carry text between recordings/sessions.
            params.suppress_nst = true;
            params.print_realtime = params.print_progress = params.print_timestamps = params.print_special = false;
            if (whisper_full(ctx, params, pcm.data(), pcm.size()) != 0) throw std::runtime_error("inference");
            auto segments = nlohmann::json::array();
            for (int i = 0; i < whisper_full_n_segments(ctx); ++i) {
                segments.push_back({{"text", whisper_full_get_segment_text(ctx, i)}});
            }
            const char * detected = whisper_lang_str(whisper_full_lang_id(ctx));
            nlohmann::json result = {{"result", {{"language", detected ? detected : language}}}, {"transcription", segments}};
            std::ofstream file(output, std::ios::trunc);
            file << result.dump(); file.close();
            if (!file) throw std::runtime_error("output");
            std::cout << "{\"ok\":true}" << std::endl;
        } catch (...) {
            std::cout << "{\"ok\":false}" << std::endl;
        }
    }
    whisper_free(ctx);
    return 0;
}
