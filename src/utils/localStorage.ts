import { useLocalStorage } from "usehooks-ts";
import { SESSION_ID_KEY } from "../constants";

export const useSessionIdKeyCache = () =>
  useLocalStorage<string>(SESSION_ID_KEY, "");
