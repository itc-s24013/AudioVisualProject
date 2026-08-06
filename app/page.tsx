import Header from "@/components/Header";
import AudioPlayer from "@/components/AudioPlayer";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-900">
      <Header />

      <section className="mx-auto flex max-w-7xl gap-8 p-8">

        <div className="flex-1">
          <AudioPlayer />
        </div>

      </section>
    </main>
  );
}