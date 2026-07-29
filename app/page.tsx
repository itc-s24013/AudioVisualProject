import Header from "@/components/Header";
import AudioPlayer from "@/components/AudioPlayer";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-900 text-white">
      <Header />

      <section className="mx-auto flex max-w-5xl justify-center px-6 py-10">
        <AudioPlayer />
      </section>
    </main>
  );
}