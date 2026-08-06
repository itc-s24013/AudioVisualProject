import { signInWithGoogle } from "./actions";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-900">

      <div className="w-full max-w-md rounded-xl bg-zinc-800 p-8 shadow-lg">

        <h1 className="mb-8 text-center text-3xl font-bold text-white">
          Audio Visualizer
        </h1>


        <form>

          <button
            formAction={signInWithGoogle}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Googleでログイン
          </button>

        </form>


      </div>

    </main>
  );
}