import type { Theme } from "@tabitabi/types";
import { seasonAutumnTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "../shared/StepList.svelte";

const autumnTheme: Theme = {
  ...seasonAutumnTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default autumnTheme;
