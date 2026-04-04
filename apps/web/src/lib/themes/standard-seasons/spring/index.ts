import type { Theme } from "@tabitabi/types";
import { seasonSpringTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "../shared/StepList.svelte";

const springTheme: Theme = {
  ...seasonSpringTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default springTheme;
