/**
 * Compatibility entrypoint for route handlers that import:
 *   `@/server/services/review-monitoring.service`
 *
 * Implementation lives under `./review-monitoring/*`.
 */
export {
  ReviewMonitoringService,
  reviewMonitoringService,
} from "./review-monitoring/review-monitoring.service";
