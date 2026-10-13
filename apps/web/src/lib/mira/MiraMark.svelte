<script lang="ts">
  let { size = '2rem' } = $props<{ size?: string }>();
</script>

<!-- The first approved curly-m concept, redrawn as a single scalable silhouette. -->
<svg
  class="mira-mark"
  viewBox="80 180 480 300"
  fill="currentColor"
  style:width={size}
  aria-hidden="true"
>
  <path
    d="M 165 329
       C 142 341 125 337 129 316
       C 134 292 186 237 210 236
       C 239 233 236 259 226 295
       L 188 417
       C 180 441 200 448 216 440
       C 230 434 233 421 244 403
       C 266 366 299 311 314 305
       C 330 298 323 320 317 346
       L 298 413
       C 291 436 307 441 324 435
       C 342 429 350 408 363 387
       C 383 354 404 328 414 326
       C 426 322 420 343 418 362
       C 414 395 414 421 435 440
       C 462 464 504 452 525 433
       C 535 424 543 411 542 403
       C 541 398 538 397 534 401
       C 517 414 494 421 479 409
       C 461 397 469 364 472 340
       C 477 310 468 289 450 285
       C 421 277 396 301 376 328
       C 385 294 380 269 360 260
       C 331 247 301 272 276 310
       C 286 277 292 243 278 221
       C 264 198 241 196 216 205
       C 181 218 133 262 109 294
       C 91 317 90 345 103 364
       C 121 390 157 384 175 366
       C 185 356 187 341 180 332
       C 177 328 170 326 165 329 Z"
  />
</svg>

<style>
  .mira-mark {
    display: block;
    flex: none;
    max-width: 100%;
    height: auto;
  }
</style>
