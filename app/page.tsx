import Header from "@/components/Header";
import AudioPlayer from "@/components/AudioPlayer";
import DesignPanel from "@/components/DesignPanel";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-900">
      <Header />

      <section className="mx-auto flex max-w-7xl gap-8 p-8">
        {/* 左側 */}
        <div className="flex-1">
          <AudioPlayer />
        </div>

        {/* 右側 */}
        <div className="w-96">
          <DesignPanel />
        </div>
      </section>
    </main>
  );
}