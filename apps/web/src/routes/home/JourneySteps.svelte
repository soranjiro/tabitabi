<script lang="ts">
  import { scrollDrawing } from "./scroll-drawing";
</script>

<section class="journey-section" aria-labelledby="journey-title">
  <h2 id="journey-title" class="visually-hidden">
    つくって、送って、みんなで見る。
  </h2>
  <div class="journey-inner" use:scrollDrawing>
    <svg class="journey-art" viewBox="0 0 600 1080" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          class="story-line entry-line"
          data-draw
          data-from="0"
          data-to=".10"
          pathLength="1"
          d="M300 0C316 42 322 74 276 98S213 150 245 170"
        />
        <path
          class="create-scene"
          data-draw
          data-from=".10"
          data-to=".27"
          pathLength="1"
          d="M245 170C273 184 279 204 260 216L204 203 179 289C170 288 163 269 167 249S166 220 153 207C137 194 138 185 151 182C180 177 185 145 168 125C151 102 123 113 119 137C114 158 120 190 105 193C91 196 86 179 101 173C120 165 134 182 125 194C114 208 94 214 87 235L64 282C51 304 41 302 42 293C47 281 52 304 61 314C80 337 120 336 152 322C181 310 211 303 237 307L275 323C302 305 323 301 352 308L389 319C414 324 432 302 431 279C431 258 424 232 407 218C392 205 371 204 373 193C373 185 382 179 380 163C385 126 346 118 329 137C314 154 320 181 341 187C358 194 366 187 362 193C354 203 335 192 314 198C294 201 287 216 282 237L275 323 292 228 352 216 341 299C335 297 337 285 342 275L341 269C330 263 329 253 340 254L353 257C363 263 369 279 381 282C396 286 404 263 407 252M179 289L204 203C235 207 270 216 282 237"
        />
        <path
          data-draw
          data-from=".27"
          data-to=".32"
          pathLength="1"
          d="M121 138C127 157 145 166 166 137M122 316C109 312 100 277 104 253C107 224 132 211 143 225C157 241 145 274 144 299C145 307 169 279 184 272L211 261C223 258 229 263 218 267L209 269C219 270 218 276 209 277C219 281 211 285 205 284C211 288 204 292 199 291L176 315M307 243L349 235 342 269 301 275ZM309 264L320 250 334 262 339 257M334 245C331 245 330 251 334 251C339 251 339 245 334 245M252 244C239 228 259 223 260 239C260 246 252 250 252 250Z"
        />
        <path
          class="story-line"
          data-draw
          data-from=".32"
          data-to=".42"
          pathLength="1"
          d="M389 319C426 328 437 363 388 382C317 410 361 427 347 457C338 476 309 466 290 474"
        />
        <path
          class="share-scene"
          data-draw
          data-from=".42"
          data-to=".57"
          pathLength="1"
          d="M290 474C273 475 264 482 265 498L281 626C283 641 294 647 308 644L354 638C369 636 371 626 368 612L351 484C349 472 344 467 330 470L290 474C277 476 270 483 272 499L288 627C290 637 297 639 308 637L351 631C360 630 361 623 359 612M283 510L337 502 344 553 290 561 283 510M290 550L305 529 319 540 328 535 337 543M307 576L340 570M310 588L332 584M281 600C255 596 234 577 241 568C249 559 256 578 237 582C220 589 190 583 179 575C164 564 140 559 139 539C138 520 159 509 174 520C188 529 187 548 177 556C165 566 146 559 139 545M148 552C155 536 173 537 178 551M354 530C378 531 373 500 401 499C418 498 416 491 416 483C416 464 439 456 452 470C466 484 459 504 442 507C426 510 417 500 416 489M426 498C427 483 448 482 452 497M354 638C389 625 426 637 415 655C402 675 339 680 321 662"
        />
        <path
          class="paper-plane"
          data-draw
          data-from=".57"
          data-to=".63"
          pathLength="1"
          d="M301 626C301 603 336 595 350 615C365 636 347 654 328 653C309 652 301 641 301 626M314 623L338 612 331 640 324 628 314 623 338 612 324 628M380 569L390 551M383 583L407 572M219 501C204 489 207 469 226 468C243 467 246 481 240 490L239 502 228 497 219 501M220 480C216 471 226 472 227 478C230 472 238 476 234 482L228 488 220 480"
        />
        <path
          class="story-line"
          data-draw
          data-from=".63"
          data-to=".72"
          pathLength="1"
          d="M321 662C286 698 306 716 329 738C354 762 353 791 317 807"
        />
        <path
          class="view-scene"
          data-draw
          data-from=".72"
          data-to=".88"
          pathLength="1"
          d="M317 807C294 801 277 819 281 841C284 862 310 870 326 855C346 839 338 812 317 807M284 853C293 865 285 871 273 875C259 879 253 890 251 906M327 855C322 869 340 871 347 889M87 943C101 934 116 920 133 896C147 878 169 879 187 889C199 897 207 909 208 929M153 873C132 870 122 849 132 833C145 811 174 815 185 832C197 853 181 875 153 873C144 872 151 859 148 846C145 837 126 839 130 851C132 860 146 852 146 839C145 823 171 816 179 830M188 845C183 860 164 873 151 870M172 895C182 904 180 928 177 948C175 956 183 944 196 934L228 912C246 901 251 906 239 912L232 916C245 913 247 919 238 922C249 922 240 927 236 926L211 950C198 964 182 976 167 976C145 975 136 952 131 939M87 943C117 965 133 980 164 978C213 974 246 954 276 959L303 927 266 923 249 962C245 968 256 968 258 961L270 928 304 929 297 961 277 962M347 889C356 879 375 882 386 896C397 910 397 931 405 947C413 962 438 964 439 976C441 990 409 986 393 978C375 969 374 954 369 940C362 924 347 922 343 905C338 884 335 862 350 848C366 832 390 838 397 855C405 873 392 891 380 887C365 884 358 867 351 854M374 892C387 902 376 917 386 928C394 937 387 949 386 966M304 962C331 963 351 977 374 980C414 986 442 973 463 953"
        />
        <path
          data-draw
          data-from=".88"
          data-to=".93"
          pathLength="1"
          d="M211 803C191 794 193 769 215 765C238 761 256 777 249 795L242 813 230 802 211 803M217 778C209 772 208 788 219 797C229 787 229 774 217 778M399 822C385 812 391 790 409 788C428 785 443 800 438 815L427 829 422 819 399 822M401 810L411 799 420 806 425 801 432 809M283 792L277 780M309 785V772M335 792L343 779"
        />
        <path
          class="story-line exit-line"
          data-draw
          data-from=".93"
          data-to="1"
          pathLength="1"
          d="M463 953C493 926 509 936 487 982C465 1031 355 1009 316 1041C307 1048 300 1062 300 1080"
        />
      </g>
    </svg>
    <p class="scene-label create-label" data-reveal=".22">旅をつくる。</p>
    <p class="scene-label share-label" data-reveal=".52">URLで送る。</p>
    <p class="scene-label view-label" data-reveal=".82">みんなで見る。</p>
  </div>
</section>

<style>
  .journey-section {
    position: relative;
    padding-inline: 16px;
    background: var(--home-paper);
  }
  .journey-inner {
    position: relative;
    width: min(660px, 100%);
    margin: auto;
  }
  .journey-art {
    display: block;
    width: 100%;
    height: auto;
    color: #354952;
  }
  .journey-art path {
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    transition: stroke-dashoffset 70ms linear;
  }
  .scene-label {
    position: absolute;
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: clamp(13px, 2.2vw, 20px);
    line-height: 1.8;
    letter-spacing: 0.035em;
    transition: opacity 120ms linear;
  }
  .create-label {
    top: 22%;
    left: 75%;
  }
  .share-label {
    top: 51%;
    left: 2%;
  }
  .view-label {
    top: 82%;
    left: 73%;
    white-space: nowrap;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  @media (max-width: 767px) {
    .journey-art path {
      stroke-width: 2.7;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .journey-art path,
    .scene-label {
      transition: none;
    }
  }
</style>
