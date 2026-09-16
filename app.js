/* ========================================
   DOM
======================================== */

const startScreen =
  document.getElementById("startScreen");

const arScreen =
  document.getElementById("arScreen");

const resultScreen =
  document.getElementById("resultScreen");

const startButton =
  document.getElementById("startButton");

const resetButton =
  document.getElementById("resetButton");

const captureButton =
  document.getElementById("captureButton");

const switchCameraButton =
  document.getElementById("switchCameraButton");

const backButton =
  document.getElementById("backButton");

const downloadButton =
  document.getElementById("downloadButton");

const status =
  document.getElementById("status");

const siteTitle =
  document.getElementById("siteTitle");

const siteDescription =
  document.getElementById("siteDescription");

const cameraWrapper =
  document.getElementById("cameraWrapper");

const cameraArea =
  document.getElementById("cameraArea");

const video =
  document.getElementById("camera");

const characterLayer =
  document.getElementById("characterLayer");

const zoomButtons =
  document.querySelectorAll(".zoomButton");

const canvas =
  document.getElementById("captureCanvas");

const ctx =
  canvas.getContext("2d");


/* ========================================
   ARデータ
======================================== */

let schoolId = null;
let contentId = null;

let schoolData = null;
let currentContent = null;

let arDataReady = false;


/* ========================================
   カメラ
======================================== */

let stream = null;

let facingMode =
  "environment";

let cameraZoom = 1;


/* ========================================
   キャラクター
======================================== */

let characters = [];

let sequenceId = 0;


/* ========================================
   URL
======================================== */

function getUrlParameters() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  schoolId =
    params.get("school");

  contentId =
    params.get("id");


  if (!schoolId) {

    throw new Error(
      "URLにschoolが指定されていません。"
    );

  }


  if (!contentId) {

    throw new Error(
      "URLにidが指定されていません。"
    );

  }

}


/* ========================================
   JSON読込
======================================== */

async function loadArData() {

  const dataUrl =
    `./schools/${encodeURIComponent(schoolId)}/data.json`;


  const response =
    await fetch(
      dataUrl,
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `data.jsonを取得できませんでした。HTTP ${response.status}`
    );

  }


  schoolData =
    await response.json();

   /*
    * 基本設定を画面へ反映
    */
   
   if (siteTitle) {
     siteTitle.textContent =
       schoolData.siteTitle ||
       "KAGA AR";
   }
   
   if (siteDescription) {
     siteDescription.textContent =
       schoolData.siteDescription ||
       "カメラを起動して、キャラクターと一緒に撮影できます。";
   }

  if (
    !Array.isArray(
      schoolData.contents
    )
  ) {

    throw new Error(
      "data.jsonのcontentsが正しくありません。"
    );

  }


  currentContent =
    schoolData.contents.find(
      item =>
        String(item.id) ===
        String(contentId)
    );


  if (!currentContent) {

    throw new Error(
      `「${contentId}」のデータが見つかりません。`
    );

  }


  if (
    !Array.isArray(
      currentContent.characters
    ) ||
    currentContent.characters.length === 0
  ) {

    throw new Error(
      "キャラクターが設定されていません。"
    );

  }


  /*
   * 登場順で並べる
   */

  currentContent.characters.sort(
    (a, b) =>
      Number(a.order || 1) -
      Number(b.order || 1)
  );


  await createCharacters();


  arDataReady =
    true;

}


/* ========================================
   キャラクター生成
======================================== */

async function createCharacters() {

  characterLayer.innerHTML =
    "";


  characters =
    [];


  for (
    const data of
    currentContent.characters
  ) {

    if (!data.image) {

      throw new Error(
        `${data.name || "キャラクター"}の画像が設定されていません。`
      );

    }


    const img =
      document.createElement(
        "img"
      );


    img.className =
      "ar-character";


    img.alt =
      data.name || "キャラクター";


    img.draggable =
      false;


    img.src =
      `./schools/${encodeURIComponent(schoolId)}/${data.image}`;


    img.style.left =
      `${Number(data.x ?? 50)}%`;


    img.style.top =
      `${Number(data.y ?? 50)}%`;


    /*
     * orderが大きいものを
     * 少し手前に表示
     */

    img.style.zIndex =
      String(
        10 +
        Number(
          data.order || 1
        )
      );


    characterLayer.appendChild(
      img
    );


    await waitForImage(
      img
    );


    const item = {

      data:
        data,

      element:
        img,

      offsetX:
        0,

      offsetY:
        0,

      scale:
        Number(
          data.size ?? 100
        ) / 100,

      pointers:
        new Map(),

      previousDistance:
        null,

      appeared:
        false

    };


    characters.push(
      item
    );


    updateCharacterTransform(
      item
    );


    addCharacterPointerEvents(
      item
    );

  }

}


/* ========================================
   画像読込待ち
======================================== */

function waitForImage(
  img
) {

  return new Promise(
    (resolve, reject) => {

      if (
        img.complete &&
        img.naturalWidth > 0
      ) {

        resolve();

        return;

      }


      img.onload =
        () => resolve();


      img.onerror =
        () => {

          reject(
            new Error(
              `画像を読み込めませんでした：${img.src}`
            )
          );

        };

    }
  );

}


/* ========================================
   初期化
======================================== */

async function initializeApp() {

  startButton.disabled =
    true;


  status.textContent =
    "ARデータを読み込んでいます...";


  try {

    getUrlParameters();

    await loadArData();

    status.textContent = currentContent.place || contentId;

    startButton.disabled =
      false;

  }
  catch (error) {

    console.error(
      error
    );


    arDataReady =
      false;


    startButton.disabled =
      true;


    status.textContent =
      "ARデータ読込エラー：" +
      error.message;

  }

}


/* ========================================
   撮影フレーム
======================================== */

function fitCameraFrame() {

  const style =
    getComputedStyle(
      cameraWrapper
    );


  const paddingX =
    parseFloat(
      style.paddingLeft
    ) +
    parseFloat(
      style.paddingRight
    );


  const paddingY =
    parseFloat(
      style.paddingTop
    ) +
    parseFloat(
      style.paddingBottom
    );


  const availableWidth =
    Math.max(
      1,
      cameraWrapper.clientWidth -
      paddingX
    );


  const availableHeight =
    Math.max(
      1,
      cameraWrapper.clientHeight -
      paddingY
    );


  const portrait =
    window.matchMedia(
      "(orientation: portrait)"
    ).matches;


  if (portrait) {

    const targetAspect =
      3 / 4;


    const availableAspect =
      availableWidth /
      availableHeight;


    let frameWidth;
    let frameHeight;


    if (
      availableAspect >
      targetAspect
    ) {

      frameHeight =
        availableHeight;


      frameWidth =
        frameHeight *
        targetAspect;

    }
    else {

      frameWidth =
        availableWidth;


      frameHeight =
        frameWidth /
        targetAspect;

    }


    cameraArea.style.width =
      `${Math.floor(frameWidth)}px`;


    cameraArea.style.height =
      `${Math.floor(frameHeight)}px`;

  }
  else {

    cameraArea.style.width =
      `${Math.floor(availableWidth)}px`;


    cameraArea.style.height =
      `${Math.floor(availableHeight)}px`;

  }

}


/* ========================================
   カメラ
======================================== */

async function startCamera() {

  stopCamera();


  const constraints = {

    video: {

      facingMode: {
        ideal: facingMode
      },

      aspectRatio: {
        ideal: 4 / 3
      },

      width: {
        ideal: 1920
      },

      height: {
        ideal: 1440
      }

    },

    audio: false

  };


  stream =
    await navigator.mediaDevices.getUserMedia(
      constraints
    );


  video.srcObject =
    stream;


  await video.play();

}


function stopCamera() {

  if (!stream) {

    return;

  }


  stream
    .getTracks()
    .forEach(
      track =>
        track.stop()
    );


  stream =
    null;

}


/* ========================================
   擬似ズーム
======================================== */

function setCameraZoom(
  zoom
) {

  cameraZoom =
    Number(
      zoom
    );


  video.style.transform =
    `scale(${cameraZoom})`;


  zoomButtons.forEach(
    button => {

      button.classList.toggle(

        "active",

        Number(
          button.dataset.zoom
        ) === cameraZoom

      );

    }
  );

}


zoomButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        setCameraZoom(
          Number(
            button.dataset.zoom
          )
        );

      }
    );

  }
);


/* ========================================
   カメラ切替
======================================== */

switchCameraButton.addEventListener(
  "click",
  async () => {

    const oldMode =
      facingMode;


    facingMode =
      facingMode ===
      "environment"
        ? "user"
        : "environment";


    try {

      await startCamera();


      setCameraZoom(1);


      requestAnimationFrame(
        fitCameraFrame
      );

    }
    catch (error) {

      console.error(
        error
      );


      facingMode =
        oldMode;

    }

  }
);


/* ========================================
   transform更新
======================================== */

function updateCharacterTransform(
  item
) {

  item.element.style.transform =
    `
      translate(-50%, -50%)
      translate(
        ${item.offsetX}px,
        ${item.offsetY}px
      )
      scale(${item.scale})
    `;

}


/* ========================================
   Pointer操作
======================================== */

function addCharacterPointerEvents(
  item
) {

  const el =
    item.element;


  el.addEventListener(
    "pointerdown",
    event => {

      if (!item.appeared) {

        return;

      }


      event.preventDefault();


      el.setPointerCapture(
        event.pointerId
      );


      item.pointers.set(
        event.pointerId,
        {
          x:
            event.clientX,

          y:
            event.clientY
        }
      );


      if (
        item.pointers.size === 2
      ) {

        const points =
          Array.from(
            item.pointers.values()
          );


        item.previousDistance =
          getDistance(
            points[0],
            points[1]
          );

      }

    }
  );


  el.addEventListener(
    "pointermove",
    event => {

      if (
        !item.pointers.has(
          event.pointerId
        )
      ) {

        return;

      }


      event.preventDefault();


      const previous =
        item.pointers.get(
          event.pointerId
        );


      item.pointers.set(
        event.pointerId,
        {
          x:
            event.clientX,

          y:
            event.clientY
        }
      );


      /*
       * 1本指：移動
       */

      if (
        item.pointers.size === 1
      ) {

        item.offsetX +=
          event.clientX -
          previous.x;


        item.offsetY +=
          event.clientY -
          previous.y;


        updateCharacterTransform(
          item
        );

      }


      /*
       * 2本指：拡大縮小
       */

      if (
        item.pointers.size === 2
      ) {

        const points =
          Array.from(
            item.pointers.values()
          );


        const distance =
          getDistance(
            points[0],
            points[1]
          );


        if (
          item.previousDistance !== null &&
          item.previousDistance > 0
        ) {

          item.scale *=
            distance /
            item.previousDistance;


          item.scale =
            Math.max(
              0.3,
              Math.min(
                item.scale,
                4
              )
            );


          updateCharacterTransform(
            item
          );

        }


        item.previousDistance =
          distance;

      }

    }
  );


  function pointerEnd(
    event
  ) {

    item.pointers.delete(
      event.pointerId
    );


    if (
      item.pointers.size < 2
    ) {

      item.previousDistance =
        null;

    }

  }


  el.addEventListener(
    "pointerup",
    pointerEnd
  );


  el.addEventListener(
    "pointercancel",
    pointerEnd
  );

}


function getDistance(
  a,
  b
) {

  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );

}


/* ========================================
   演出削除
======================================== */

function clearCharacterEffects(
  item
) {

  item.element.classList.remove(

    "entry-fade",
    "entry-pop",
    "entry-from-left",
    "entry-from-right",
    "entry-from-bottom",
    "entry-from-top",

    "idle-float",
    "idle-jump",
    "idle-shake",
    "idle-sway"

  );


  item.element.style.animationDuration =
    "";


  item.element.style.animationTimingFunction =
    "";


  item.element.style.animationFillMode =
    "";

}


/* ========================================
   1体を登場させる
======================================== */

async function showCharacter(
  item,
  mySequenceId
) {

  const data =
    item.data;


  /*
   * 自分の順番になってから
   * delayを待つ
   */

  await wait(
    Number(
      data.delay ?? 0
    )
  );


  /*
   * リセットされた場合は中止
   */

  if (
    mySequenceId !==
    sequenceId
  ) {

    return false;

  }


  clearCharacterEffects(
    item
  );


  const el =
    item.element;


  el.style.opacity =
    "1";


  item.appeared =
    true;


  const entryMap = {

    fade:
      "entry-fade",

    pop:
      "entry-pop",

    "from-left":
      "entry-from-left",

    "from-right":
      "entry-from-right",

    "from-bottom":
      "entry-from-bottom",

    "from-top":
      "entry-from-top"

  };


  const idleMap = {

    float:
      "idle-float",

    jump:
      "idle-jump",

    shake:
      "idle-shake",

    sway:
      "idle-sway"

  };


  const entryClass =
    entryMap[
      data.entryEffect
    ];


  const duration =
    Math.max(
      0,
      Number(
        data.duration ?? 700
      )
    );


  /*
   * 登場演出
   */

  if (entryClass) {

    el.classList.add(
      entryClass
    );


    el.style.animationDuration =
      `${duration}ms`;


    el.style.animationTimingFunction =
      "ease-out";


    el.style.animationFillMode =
      "both";


    await wait(
      duration
    );


    if (
      mySequenceId !==
      sequenceId
    ) {

      return false;

    }


    el.classList.remove(
      entryClass
    );


    el.style.animationDuration =
      "";


    el.style.animationTimingFunction =
      "";


    el.style.animationFillMode =
      "";

  }


  /*
   * 登場後の動き
   */

  const idleClass =
    idleMap[
      data.idleEffect
    ];


  if (idleClass) {

    el.classList.add(
      idleClass
    );

  }


  return true;

}


/* ========================================
   全キャラクターを順番に登場
======================================== */

async function startCharacterSequence() {

  /*
   * 前の実行を無効化
   */

  sequenceId++;


  const mySequenceId =
    sequenceId;


  /*
   * 全員を初期状態へ
   */

  characters.forEach(
    item => {

      clearCharacterEffects(
        item
      );


      item.offsetX =
        0;


      item.offsetY =
        0;


      item.scale =
        Number(
          item.data.size ?? 100
        ) / 100;


      item.element.style.left =
        `${Number(
          item.data.x ?? 50
        )}%`;


      item.element.style.top =
        `${Number(
          item.data.y ?? 50
        )}%`;


      item.element.style.opacity =
        "0";


      item.appeared =
        false;


      item.pointers.clear();


      item.previousDistance =
        null;


      updateCharacterTransform(
        item
      );

    }
  );


  /*
   * order順に登場
   */

  for (
    const item of characters
  ) {

    const completed =
      await showCharacter(
        item,
        mySequenceId
      );


    if (!completed) {

      return;

    }

  }

}


/* ========================================
   wait
======================================== */

function wait(
  ms
) {

  return new Promise(
    resolve => {

      setTimeout(
        resolve,
        ms
      );

    }
  );

}


/* ========================================
   リセット
======================================== */

resetButton.addEventListener(
  "click",
  () => {

    startCharacterSequence();

  }
);


/* ========================================
   AR開始
======================================== */

startButton.addEventListener(
  "click",
  async () => {

    if (
      !arDataReady ||
      !currentContent
    ) {

      alert(
        "ARデータの読み込みが完了していません。"
      );

      return;

    }


    try {

      status.textContent =
        "カメラを起動しています...";


      await startCamera();


      startScreen.classList.add(
        "hidden"
      );


      arScreen.classList.remove(
        "hidden"
      );


      requestAnimationFrame(
        () => {

          fitCameraFrame();


          setCameraZoom(
            1
          );


          startCharacterSequence();

        }
      );

    }
    catch (error) {

      console.error(
        error
      );


      status.textContent =
        "カメラ起動失敗：" +
        error.name +
        " / " +
        error.message;

    }

  }
);


/* ========================================
   撮影
======================================== */

captureButton.addEventListener(
  "click",
  capture
);


function capture() {

  const videoWidth =
    video.videoWidth;


  const videoHeight =
    video.videoHeight;


  if (
    !videoWidth ||
    !videoHeight
  ) {

    alert(
      "カメラ映像を取得できません。"
    );

    return;

  }


  const areaRect =
    cameraArea.getBoundingClientRect();


  const frameAspect =
    areaRect.width /
    areaRect.height;


  const longSide =
    1440;


  if (
    areaRect.height >
    areaRect.width
  ) {

    canvas.height =
      longSide;


    canvas.width =
      Math.round(
        longSide *
        frameAspect
      );

  }
  else {

    canvas.width =
      longSide;


    canvas.height =
      Math.round(
        longSide /
        frameAspect
      );

  }


  const videoAspect =
    videoWidth /
    videoHeight;


  let sourceX = 0;
  let sourceY = 0;

  let sourceWidth =
    videoWidth;

  let sourceHeight =
    videoHeight;


  /*
   * object-fit: cover相当
   */

  if (
    videoAspect >
    frameAspect
  ) {

    sourceWidth =
      videoHeight *
      frameAspect;


    sourceX =
      (
        videoWidth -
        sourceWidth
      ) / 2;

  }
  else {

    sourceHeight =
      videoWidth /
      frameAspect;


    sourceY =
      (
        videoHeight -
        sourceHeight
      ) / 2;

  }


  /*
   * 擬似ズーム
   */

  if (
    cameraZoom > 1
  ) {

    const zoomWidth =
      sourceWidth /
      cameraZoom;


    const zoomHeight =
      sourceHeight /
      cameraZoom;


    sourceX +=
      (
        sourceWidth -
        zoomWidth
      ) / 2;


    sourceY +=
      (
        sourceHeight -
        zoomHeight
      ) / 2;


    sourceWidth =
      zoomWidth;


    sourceHeight =
      zoomHeight;

  }


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
   * カメラ映像
   */

  ctx.drawImage(
    video,

    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,

    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
   * 表示済みの全キャラクター
   */

  const scaleX =
    canvas.width /
    areaRect.width;


  const scaleY =
    canvas.height /
    areaRect.height;


  const visibleCharacters =
    characters
      .filter(
        item =>
          item.appeared
      )
      .sort(
        (a, b) =>
          Number(
            a.data.order || 1
          ) -
          Number(
            b.data.order || 1
          )
      );


  visibleCharacters.forEach(
    item => {

      const rect =
        item.element
          .getBoundingClientRect();


      ctx.drawImage(
        item.element,

        (
          rect.left -
          areaRect.left
        ) *
          scaleX,

        (
          rect.top -
          areaRect.top
        ) *
          scaleY,

        rect.width *
          scaleX,

        rect.height *
          scaleY
      );

    }
  );


  /*
   * 保存データ
   */

  canvas.toBlob(
    blob => {

      if (!blob) {

        return;

      }


      if (
        downloadButton.dataset.url
      ) {

        URL.revokeObjectURL(
          downloadButton.dataset.url
        );

      }


      const url =
        URL.createObjectURL(
          blob
        );


      downloadButton.href =
        url;


      downloadButton.dataset.url =
        url;


      downloadButton.download =
        `${schoolId}_${contentId}.jpg`;

    },

    "image/jpeg",

    0.92
  );


  arScreen.classList.add(
    "hidden"
  );


  resultScreen.classList.remove(
    "hidden"
  );

}


/* ========================================
   撮り直す
======================================== */

backButton.addEventListener(
  "click",
  () => {

    resultScreen.classList.add(
      "hidden"
    );


    arScreen.classList.remove(
      "hidden"
    );


    requestAnimationFrame(
      fitCameraFrame
    );

  }
);


/* ========================================
   リサイズ
======================================== */

window.addEventListener(
  "resize",
  () => {

    if (
      !arScreen.classList.contains(
        "hidden"
      )
    ) {

      fitCameraFrame();

    }

  }
);


/* ========================================
   画面回転
======================================== */

window.addEventListener(
  "orientationchange",
  () => {

    setTimeout(
      () => {

        fitCameraFrame();

      },
      300
    );

  }
);


/* ========================================
   起動
======================================== */

initializeApp();
