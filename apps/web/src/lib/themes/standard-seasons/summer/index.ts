import type { Theme } from "@tabitabi/types";
import { seasonSummerTheme } from "./config";
import ItineraryView from "../shared/ItineraryView.svelte";
import StepList from "../shared/StepList.svelte";

const summerTheme: Theme = {
  ...seasonSummerTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default summerTheme;
