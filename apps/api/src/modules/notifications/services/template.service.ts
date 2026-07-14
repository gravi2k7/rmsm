import { Injectable } from "@nestjs/common";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { NotificationTemplate } from "@rmsm/database";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import {
  NotificationTemplateRepository,
  CreateNotificationTemplateInput,
  UpdateNotificationTemplateInput,
} from "../repositories/notification-template.repository";
import { RmsmTemplateEngine } from "../providers/rmsm-template-engine";
import { RenderedContent } from "../interfaces/template-engine.interface";

@Injectable()
export class TemplateService {
  constructor(
    private readonly templateRepository: NotificationTemplateRepository,
    private readonly engine: RmsmTemplateEngine,
    private readonly auditService: AuditService,
  ) {}

  async render(
    organizationId: string | null,
    templateKey: string,
    locale: string,
    variables: Record<string, unknown>,
  ): Promise<RenderedContent> {
    const template =
      (organizationId ? await this.templateRepository.findByKey(organizationId, templateKey, locale) : null) ??
      (await this.templateRepository.findByKey(null, templateKey, locale));
    if (!template) {
      throw new NotFoundError("NotificationTemplate", `${templateKey}/${locale}`);
    }

    const layout = template.layoutId ? await this.templateRepository.findById(template.layoutId) : null;
    const rendered = await this.engine.render(template.bodyTemplate, layout?.bodyTemplate ?? null, {
      variables,
      locale,
    });

    const subject = template.subjectTemplate
      ? (await this.engine.render(template.subjectTemplate, null, { variables, locale })).body
      : undefined;

    return { subject, body: rendered.body, format: template.format };
  }

  async create(
    data: CreateNotificationTemplateInput,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<NotificationTemplate> {
    const validation = this.engine.validateSyntax(data.bodyTemplate);
    if (!validation.valid) {
      throw new ValidationError("Template syntax is invalid.", { errors: validation.errors });
    }

    const template = await this.templateRepository.create({ ...data, createdById: actorId });
    await this.auditService.log("notification.template.created", {
      userId: actorId,
      entityType: "NotificationTemplate",
      entityId: template.id,
      metadata: { key: data.key, channel: data.channel },
      ...ctx,
    });
    return template;
  }

  async update(
    id: string,
    data: UpdateNotificationTemplateInput,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<NotificationTemplate> {
    const existing = await this.templateRepository.findById(id);
    if (!existing) throw new NotFoundError("NotificationTemplate", id);

    if (data.bodyTemplate) {
      const validation = this.engine.validateSyntax(data.bodyTemplate);
      if (!validation.valid) {
        throw new ValidationError("Template syntax is invalid.", { errors: validation.errors });
      }
    }

    const updated = await this.templateRepository.update(id, data, actorId);
    await this.auditService.log("notification.template.updated", {
      userId: actorId,
      entityType: "NotificationTemplate",
      entityId: id,
      metadata: { fields: Object.keys(data) },
      ...ctx,
    });
    return updated;
  }

  validate(templateBody: string): { valid: boolean; errors: string[] } {
    return this.engine.validateSyntax(templateBody);
  }
}
