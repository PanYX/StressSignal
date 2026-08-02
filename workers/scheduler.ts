import { runScheduledDataRefresh } from "../lib/cloudflare/scheduled-data-refresh";

const scheduler = {
  scheduled(
    controller: ScheduledController,
    env: SchedulerEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      runScheduledDataRefresh({
        selfReference: env.STRESSSIGNAL,
        cronSecret: env.CRON_SECRET,
        cron: controller.cron,
        scheduledTime: controller.scheduledTime,
      }).then((result) => {
        if (result.failedSteps.length > 0) {
          throw new Error(
            `Scheduled data refresh failed: ${result.failedSteps.join(", ")}`,
          );
        }
      }),
    );
  },
} satisfies ExportedHandler<SchedulerEnv>;

export default scheduler;

