import { redirect } from "next/navigation";

// Le proxy renvoie vers /connexion si l'utilisateur n'est pas connecté.
export default function Home() {
  redirect("/tableau-de-bord");
}
