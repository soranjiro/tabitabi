import type { Theme } from "@tabitabi/types";
import { seasonWinterTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "../shared/StepList.svelte";

const winterTheme: Theme = {
  ...seasonWinterTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default winterTheme;
