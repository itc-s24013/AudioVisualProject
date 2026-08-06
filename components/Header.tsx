import { getCurrentAccountInfo, signOut } from "@/app/login/actions";
import Link from "next/link";

export default async function Header() {

  let user = null;

  try {
    user = await getCurrentAccountInfo();
  } catch {
    user = null;
  }


  return (
    <header className="flex w-full items-center justify-between border-b border-zinc-700 bg-zinc-900 p-6">

      <h1 className="text-2xl font-bold text-white">
        Web Audio Visualizer
      </h1>


      <div>

        {user ? (

          <div className="flex items-center gap-4">

            <span className="text-white">
              {user.name}
            </span>


            <form>

              <button
                formAction={signOut}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                ログアウト
              </button>

            </form>

          </div>


        ) : (

          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            ログイン
          </Link>

        )}

      </div>


    </header>
  );
}