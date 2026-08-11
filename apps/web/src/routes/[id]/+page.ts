import type { PageLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const prerender = false;

export const load: PageLoad = ({ params }) => {
  throw redirect(308, `/itineraries/${params.id}`);
};
