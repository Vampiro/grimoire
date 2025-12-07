import { useAtomValue } from "jotai";
import { userAtom } from "./firebase/authAtom";
import { signInWithGoogle, logout } from "./firebase/auth";

export default function Login() {
  const user = useAtomValue(userAtom);

  if (user) {
    return (
      <div>
        <p>Logged in as {user.displayName}</p>
        <button
          onClick={() => logout()}
          className="bg-red-500 text-white p-2 rounded mt-2"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => signInWithGoogle()}
        className="bg-blue-500 text-white p-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}
