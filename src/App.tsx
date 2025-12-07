import "./App.css";
import CharacterList from "./CharacterList";
import { useAuthListener } from "./firebase/hooks";
import { useAuthUser } from "./firebase/useAuthUser";
import Login from "./Login";

function App() {
  useAuthListener();
  const user = useAuthUser();
  return (
    <div>
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <Login />

      {user && (
        <div>
          Characters:
          <CharacterList />
        </div>
      )}
    </div>
  );
}

export default App;
