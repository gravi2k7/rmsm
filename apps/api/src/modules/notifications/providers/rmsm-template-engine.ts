import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { TemplateFormat } from "@rmsm/database";
import { TemplateEngine, RenderContext, RenderedContent } from "../interfaces/template-engine.interface";

/**
 * A real, working template engine implementing Phase 1's `TemplateEngine`
 * contract — variables, conditionals (`{{#if}}...{{else}}...{{/if}}`),
 * and loops (`{{#each}}...{{/each}}`), hand-implemented rather than
 * depending on Handlebars/Mustache/etc. This is a deliberately scoped-
 * down subset of what a full templating library supports, not a
 * placeholder: it correctly handles nested blocks (an `{{#each}}`
 * containing an `{{#if}}`, and vice versa) via matched-tag-depth parsing,
 * not naive first-closing-tag regex matching.
 *
 * Explicitly NOT supported, flagged rather than silently attempted:
 * comparison operators inside `{{#if}}` (only simple truthy variable
 * checks — `{{#if user.isActive}}`, not `{{#if count > 5}}`), helper
 * functions, and partials beyond the layout-wrapping TemplateService
 * (Phase 2c) handles separately. If any of these become real product
 * requirements, replacing this with Handlebars at that point is a
 * contained, one-file change — every caller depends on the
 * `TemplateEngine` interface, not this implementation directly.
 */
@Injectable()
export class RmsmTemplateEngine implements TemplateEngine {
  async render(templateBody: string, layoutBody: string | null, context: RenderContext): Promise<RenderedContent> {
    const rendered = this.renderBlock(templateBody, context.variables);
    const body = layoutBody ? this.renderBlock(layoutBody, { ...context.variables, content: rendered }) : rendered;
    return { body, format: "HTML" as TemplateFormat };
  }

  validateSyntax(templateBody: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const tag of ["if", "each"]) {
      const openCount = (templateBody.match(new RegExp(`{{#${tag}\\b`, "g")) ?? []).length;
      const closeCount = (templateBody.match(new RegExp(`{{/${tag}}}`, "g")) ?? []).length;
      if (openCount !== closeCount) {
        errors.push(`Mismatched {{#${tag}}}/{{/${tag}}} tags: ${openCount} opening, ${closeCount} closing.`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private renderBlock(template: string, variables: Record<string, unknown>): string {
    let result = this.renderEachBlocks(template, variables);
    result = this.renderIfBlocks(result, variables);
    result = this.renderVariables(result, variables);
    return result;
  }

  /** Finds the matching {{/each}} for each {{#each}}, respecting nesting depth of the SAME tag — not the first {{/each}} found, which would be wrong for nested {{#each}} blocks. */
  private renderEachBlocks(template: string, variables: Record<string, unknown>): string {
    const openTag = /{{#each\s+([\w.]+)}}/;
    let result = template;
    let match: RegExpExecArray | null;

    while ((match = openTag.exec(result))) {
      const [fullOpenTag, pathExpr] = match;
      if (!pathExpr) throw new ValidationError("Malformed {{#each}} tag: missing path expression.");
      const startIndex = match.index;
      const bodyStart = startIndex + fullOpenTag.length;
      const closeIndex = this.findMatchingClose(result, bodyStart, "{{#each", "{{/each}}");
      if (closeIndex === -1) {
        throw new ValidationError(`Unclosed {{#each ${pathExpr}}} block in template.`);
      }

      const blockBody = result.slice(bodyStart, closeIndex);
      const arrayValue = this.resolvePath(variables, pathExpr);
      const items = Array.isArray(arrayValue) ? arrayValue : [];

      const rendered = items
        .map((item, index) => {
          const itemScope =
            typeof item === "object" && item !== null
              ? { ...variables, ...(item as Record<string, unknown>), this: item, "@index": index }
              : { ...variables, this: item, "@index": index };
          return this.renderBlock(blockBody, itemScope);
        })
        .join("");

      result = result.slice(0, startIndex) + rendered + result.slice(closeIndex + "{{/each}}".length);
      openTag.lastIndex = 0;
    }
    return result;
  }

  private renderIfBlocks(template: string, variables: Record<string, unknown>): string {
    const openTag = /{{#if\s+([\w.]+)}}/;
    let result = template;
    let match: RegExpExecArray | null;

    while ((match = openTag.exec(result))) {
      const [fullOpenTag, pathExpr] = match;
      if (!pathExpr) throw new ValidationError("Malformed {{#if}} tag: missing condition expression.");
      const startIndex = match.index;
      const bodyStart = startIndex + fullOpenTag.length;
      const closeIndex = this.findMatchingClose(result, bodyStart, "{{#if", "{{/if}}");
      if (closeIndex === -1) {
        throw new ValidationError(`Unclosed {{#if ${pathExpr}}} block in template.`);
      }

      const fullBlock = result.slice(bodyStart, closeIndex);
      const elseIndex = this.findTopLevelElse(fullBlock);
      const truthyBlock = elseIndex === -1 ? fullBlock : fullBlock.slice(0, elseIndex);
      const falsyBlock = elseIndex === -1 ? "" : fullBlock.slice(elseIndex + "{{else}}".length);

      const conditionValue = this.resolvePath(variables, pathExpr);
      const chosen = conditionValue ? truthyBlock : falsyBlock;

      result = result.slice(0, startIndex) + this.renderBlock(chosen, variables) + result.slice(closeIndex + "{{/if}}".length);
      openTag.lastIndex = 0;
    }
    return result;
  }

  private renderVariables(template: string, variables: Record<string, unknown>): string {
    return template.replace(/{{\s*([\w.@]+)\s*}}/g, (_match, path: string) => {
      const value = this.resolvePath(variables, path);
      return value === undefined || value === null ? "" : String(value);
    });
  }

  /** Scans forward counting nested open/close tags of the SAME kind to find the true matching close, not the first occurrence. */
  private findMatchingClose(text: string, fromIndex: number, openPrefix: string, closeTag: string): number {
    let depth = 1;
    let i = fromIndex;
    while (i < text.length) {
      const nextOpen = text.indexOf(openPrefix, i);
      const nextClose = text.indexOf(closeTag, i);
      if (nextClose === -1) return -1;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + openPrefix.length;
      } else {
        depth -= 1;
        if (depth === 0) return nextClose;
        i = nextClose + closeTag.length;
      }
    }
    return -1;
  }

  /** Only matches {{else}} at nesting depth 0 relative to the block being scanned — an {{else}} inside a nested {{#if}} shouldn't split the outer block. */
  private findTopLevelElse(block: string): number {
    let depth = 0;
    let i = 0;
    while (i < block.length) {
      if (block.startsWith("{{#if", i)) {
        depth += 1;
        i += 5;
      } else if (block.startsWith("{{/if}}", i)) {
        depth -= 1;
        i += 7;
      } else if (depth === 0 && block.startsWith("{{else}}", i)) {
        return i;
      } else {
        i += 1;
      }
    }
    return -1;
  }

  private resolvePath(variables: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[key];
    }, variables);
  }
}
