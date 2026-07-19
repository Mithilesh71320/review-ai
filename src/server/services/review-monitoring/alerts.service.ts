import { AlertType } from "@/generated/prisma/client";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";

export class AlertsService {
  async getAlerts(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      await reviewMonitoringRepository.resolveSelectedManagedBusiness(
        workspace.id,
        managedBusinessId,
      );
    const managedId = selectedManagedBusiness?.id;

    const [alerts, rules, unreadCount] = await Promise.all([
      reviewMonitoringRepository.listAlerts(workspace.id, managedId, { take: 100 }),
      reviewMonitoringRepository.listAlertRules(workspace.id),
      reviewMonitoringRepository.countUnreadAlerts(workspace.id, managedId),
    ]);

    return {
      unreadCount,
      alerts: alerts.map((alert) => ({
        id: alert.id,
        type: alert.type.toLowerCase(),
        title: alert.title,
        description: alert.description,
        severity: alert.severity.toLowerCase(),
        read: alert.isRead,
        createdAt: alert.createdAt.toISOString(),
      })),
      rules: rules.map((rule) => ({
        id: rule.id,
        type: rule.type,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
      })),
      selectedBusinessId: selectedManagedBusiness?.id ?? null,
    };
  }

  async markAllAlertsRead(userId: string, managedBusinessId?: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const selectedManagedBusiness =
      await reviewMonitoringRepository.resolveSelectedManagedBusiness(
        workspace.id,
        managedBusinessId,
      );

    if (!selectedManagedBusiness) {
      await reviewMonitoringRepository.markAllAlertsRead(workspace.id);
      return;
    }

    await reviewMonitoringRepository.markAllAlertsReadForManagedBusiness(
      workspace.id,
      selectedManagedBusiness.id,
    );
  }

  async updateAlertRule(userId: string, type: AlertType, enabled: boolean) {
    const businessId = await reviewMonitoringRepository.getOrCreateBusinessId(userId);
    await reviewMonitoringRepository.updateAlertRule(businessId, type, enabled);
  }
}

export const alertsService = new AlertsService();
