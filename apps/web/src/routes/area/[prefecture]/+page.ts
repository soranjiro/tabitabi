import { error } from "@sveltejs/kit";
import { findPrefecture, prefectures } from "$lib/explore/data";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = ({ params }) => {
  const prefecture = findPrefecture(params.prefecture);
  if (!prefecture) throw error(404, "都道府県が見つかりません");

  return {
    prefecture,
    nearby: prefectures
      .filter((item) => item.region === prefecture.region && item.slug !== prefecture.slug)
      .slice(0, 5),
  };
};
