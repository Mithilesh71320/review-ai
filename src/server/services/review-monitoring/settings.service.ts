import {
  assertBusinessLimit,
  type SubscriptionAccess,
} from "@/lib/billing-access";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";
import { prettyEnum } from "@/server/domain/formatting";
import type { SettingsPayload } from "@/server/domain/settings-payload";

export class SettingsService {
  async getSettings(userId: string, access: SubscriptionAccess) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const storedReviews = await reviewMonitoringRepository.countReviews(workspace.id);

    return {
      business: {
        name: workspace.name,
        email: workspace.email ?? "",
        phone: workspace.phone ?? "",
        website: workspace.website ?? "",
        placeId: workspace.placeId ?? "",
      },
      notifications: {
        emailNotifications: workspace.settings?.emailNotifications ?? true,
        pushNotifications: workspace.settings?.pushNotifications ?? true,
        smsNotifications: workspace.settings?.smsNotifications ?? false,
        weeklyDigest: workspace.settings?.weeklyDigest ?? true,
      },
      ai: {
        provider: workspace.settings?.aiProvider ?? "gemini",
        sentimentModel: workspace.settings?.sentimentModel ?? "balanced",
        analysisLanguage: workspace.settings?.analysisLanguage ?? "en",
        autoRespond: workspace.settings?.autoRespond ?? true,
        businessContext: workspace.settings?.businessContext ?? "",
      },
      sources: workspace.sources.map((source) => ({
        source: prettyEnum(source.source),
        key: source.source,
        connected: source.connected,
      })),
      businesses: workspace.managedBusinesses.map((business) => ({
        id: business.id,
        name: business.name,
        placeId: business.placeId,
        accountName: business.accountName,
        locationName: business.locationName,
        mapsUri: business.mapsUri,
      })),
      subscription: {
        planKey: access.planKey,
        planName: access.plan?.name ?? null,
        hasPaidPlan: access.hasPaidPlan,
        limits: {
          maxBusinesses: access.plan?.limits.maxBusinesses ?? null,
          maxStoredReviews: access.plan?.limits.maxStoredReviews ?? null,
        },
        capabilities: access.capabilities,
        usage: {
          businesses: workspace.managedBusinesses.length,
          storedReviews,
        },
      },
    };
  }

  async updateSettings(
    userId: string,
    access: SubscriptionAccess,
    payload: SettingsPayload,
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const normalizedBusinesses = payload.businesses
      .map((business) => ({
        ...business,
        name: business.name.trim(),
        placeId: business.placeId.trim(),
      }))
      .filter((business) => business.name && business.placeId);

    if (normalizedBusinesses.length > 0) {
      assertBusinessLimit(access, normalizedBusinesses.length);
    }

    await Promise.all([
      reviewMonitoringRepository.updateSettings(workspace.id, {
        business: {
          name: payload.business.name.trim() || "My Business",
          email: payload.business.email.trim() || null,
          phone: payload.business.phone.trim() || null,
          website: payload.business.website.trim() || null,
          placeId: payload.business.placeId.trim() || null,
        },
        settings: {
          emailNotifications: payload.notifications.emailNotifications,
          pushNotifications: payload.notifications.pushNotifications,
          smsNotifications: payload.notifications.smsNotifications,
          weeklyDigest: payload.notifications.weeklyDigest,
          autoRespond: payload.ai.autoRespond,
          aiProvider: payload.ai.provider,
          sentimentModel: payload.ai.sentimentModel,
          analysisLanguage: payload.ai.analysisLanguage,
          businessContext: payload.ai.businessContext?.trim() || null,
        },
        sources: payload.sources.map((source) => ({
          source: source.key,
          connected: source.connected,
        })),
      }),
      reviewMonitoringRepository.upsertManagedBusinesses(
        workspace.id,
        normalizedBusinesses,
      ),
    ]);

    reviewMonitoringRepository.invalidateWorkspaceCache(userId);
  }
}

export const settingsService = new SettingsService();
