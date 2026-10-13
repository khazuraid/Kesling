import { redirect } from "next/navigation";

export default function SystemErrorsRedirect() {
  redirect("/audit-log?tab=errors");
}
