import { useLocalStorage } from "usehooks-ts";
import { SESSION_REFERENCE_KEY } from "../constants";

export const useSessionReferenceKeyCache = () =>
  useLocalStorage<string>(SESSION_REFERENCE_KEY, "");
