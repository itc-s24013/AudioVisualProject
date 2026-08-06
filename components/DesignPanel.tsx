"use client";


type Props = {
  lineColor: string;
  setLineColor: (value: string) => void;

  lineWidth: number;
  setLineWidth: (value: number) => void;

  fftSize: number;
  setFftSize: (value: number) => void;
};


export default function DesignPanel({
  lineColor,
  setLineColor,

  lineWidth,
  setLineWidth,

  fftSize,
  setFftSize,

}: Props) {


  const handleSave = () => {
    console.log("===== デザイン設定 =====");
    console.log("色:", lineColor);
    console.log("バーの太さ:", lineWidth);
    console.log("FFTサイズ:", fftSize);

    alert("設定を保存しました！");
  };


  return (
    <div className="w-full rounded-xl bg-zinc-800 p-6 shadow-lg">

      <h2 className="mb-6 text-2xl font-bold text-white">
        デザイン設定
      </h2>


      <div className="space-y-6">


        {/* 色 */}
        <div>

          <label className="mb-2 block text-white">
            ビジュアライザーの色
          </label>


          <input
            type="color"
            value={lineColor}

            onChange={(e) =>
              setLineColor(e.target.value)
            }

            className="h-12 w-20 cursor-pointer rounded"
          />

        </div>



        {/* バーの太さ */}
        <div>

          <label className="mb-2 block text-white">
            バーの太さ
          </label>


          <input
            type="range"
            min="2"
            max="20"

            value={lineWidth}

            onChange={(e) =>
              setLineWidth(
                Number(e.target.value)
              )
            }

            className="w-full"
          />


          <p className="mt-2 text-zinc-300">
            {lineWidth}px
          </p>


        </div>




        {/* FFTサイズ */}
        <div>


          <label className="mb-2 block text-white">
            FFTサイズ
          </label>


          <select
            value={fftSize}

            onChange={(e) =>
              setFftSize(
                Number(e.target.value)
              )
            }

            className="w-full rounded bg-zinc-700 p-2 text-white"
          >

            <option value={256}>
              256
            </option>

            <option value={512}>
              512
            </option>

            <option value={1024}>
              1024
            </option>

            <option value={2048}>
              2048
            </option>

          </select>


        </div>




        <button
          onClick={handleSave}

          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >

          設定を保存

        </button>


      </div>


    </div>
  );
}