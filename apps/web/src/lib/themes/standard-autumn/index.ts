import type { Theme } from "@tabitabi/types";
import { autumnTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "./StepList.svelte";

const fallTheme: Theme = {
  ...autumnTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default fallTheme;
