import { describe, expect, it } from "vitest";
import { PrismaRepository, type PrismaModelDelegate } from "../repositories/prisma.repository";
import { RecordNotFoundError, UniqueConstraintViolationError } from "../errors/database.errors";
import type { DbClient } from "../interfaces/repository.interface";

interface Widget {
  id: string;
  name: string;
  deletedAt: Date | null;
}

class FakeWidgetDelegate implements PrismaModelDelegate<Widget, { id: string }, Record<string, unknown>, { id: string; name: string }, Partial<Widget>> {
  private readonly rows = new Map<string, Widget>();
  private nextUniqueError = false;

  seed(widget: Widget): void {
    this.rows.set(widget.id, widget);
  }

  triggerUniqueViolationOnNextCreate(): void {
    this.nextUniqueError = true;
  }

  async findUnique(args: { where: { id: string } }): Promise<Widget | null> {
    return this.rows.get(args.where.id) ?? null;
  }

  async findMany(args: { skip: number; take: number }): Promise<Widget[]> {
    return Array.from(this.rows.values()).slice(args.skip, args.skip + args.take);
  }

  async count(): Promise<number> {
    return this.rows.size;
  }

  async create(args: { data: { id: string; name: string } }): Promise<Widget> {
    if (this.nextUniqueError) {
      this.nextUniqueError = false;
      const { Prisma } = await import("@prisma/client");
      const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.22.0" });
      (error as { meta?: unknown }).meta = { target: ["name"] };
      throw error;
    }
    const widget: Widget = { id: args.data.id, name: args.data.name, deletedAt: null };
    this.rows.set(widget.id, widget);
    return widget;
  }

  async update(args: { where: { id: string }; data: Partial<Widget> }): Promise<Widget> {
    const existing = this.rows.get(args.where.id);
    if (!existing) {
      const { Prisma } = await import("@prisma/client");
      throw new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "5.22.0" });
    }
    const updated = { ...existing, ...args.data };
    this.rows.set(updated.id, updated);
    return updated;
  }

  async delete(args: { where: { id: string } }): Promise<Widget> {
    const existing = this.rows.get(args.where.id);
    if (!existing) throw new Error("not found");
    this.rows.delete(args.where.id);
    return existing;
  }
}

class WidgetRepository extends PrismaRepository<Widget, string, { id: string }, Record<string, unknown>, { id: string; name: string }, Partial<Widget>> {
  constructor(private readonly delegate: FakeWidgetDelegate) {
    super({ entityName: "Widget", defaultClient: {} as DbClient });
  }

  protected getDelegate(): FakeWidgetDelegate {
    return this.delegate;
  }

  protected idToWhereUnique(id: string): { id: string } {
    return { id };
  }

  protected softDeleteData(): Partial<Widget> {
    return { deletedAt: new Date() };
  }

  protected restoreData(): Partial<Widget> {
    return { deletedAt: null };
  }

  protected isEntityDeleted(entity: Widget): boolean {
    return entity.deletedAt !== null;
  }
}

describe("BaseRepository.getOrThrow", () => {
  it("returns the entity when found", async () => {
    const delegate = new FakeWidgetDelegate();
    delegate.seed({ id: "1", name: "Widget One", deletedAt: null });
    const repo = new WidgetRepository(delegate);

    const widget = await repo.getOrThrow("1");
    expect(widget.name).toBe("Widget One");
  });

  it("throws RecordNotFoundError when not found", async () => {
    const repo = new WidgetRepository(new FakeWidgetDelegate());
    await expect(repo.getOrThrow("missing")).rejects.toBeInstanceOf(RecordNotFoundError);
  });
});

describe("PrismaRepository — generic CRUD", () => {
  it("findById returns null for a missing record", async () => {
    const repo = new WidgetRepository(new FakeWidgetDelegate());
    expect(await repo.findById("missing")).toBeNull();
  });

  it("create persists and returns the new record", async () => {
    const repo = new WidgetRepository(new FakeWidgetDelegate());
    const widget = await repo.create({ id: "1", name: "New Widget" });
    expect(widget).toMatchObject({ id: "1", name: "New Widget" });
    expect(await repo.findById("1")).toMatchObject({ name: "New Widget" });
  });

  it("translates a unique-constraint violation into UniqueConstraintViolationError", async () => {
    const delegate = new FakeWidgetDelegate();
    delegate.triggerUniqueViolationOnNextCreate();
    const repo = new WidgetRepository(delegate);

    await expect(repo.create({ id: "1", name: "Dup" })).rejects.toBeInstanceOf(UniqueConstraintViolationError);
  });

  it("update modifies an existing record", async () => {
    const delegate = new FakeWidgetDelegate();
    delegate.seed({ id: "1", name: "Original", deletedAt: null });
    const repo = new WidgetRepository(delegate);

    const updated = await repo.update("1", { name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("update on a missing record translates P2025 into RecordNotFoundError", async () => {
    const repo = new WidgetRepository(new FakeWidgetDelegate());
    await expect(repo.update("missing", { name: "x" })).rejects.toBeInstanceOf(RecordNotFoundError);
  });

  it("findMany returns a paginated result", async () => {
    const delegate = new FakeWidgetDelegate();
    delegate.seed({ id: "1", name: "A", deletedAt: null });
    delegate.seed({ id: "2", name: "B", deletedAt: null });
    const repo = new WidgetRepository(delegate);

    const result = await repo.findMany(undefined, { page: 1, pageSize: 10 });
    expect(result.data).toHaveLength(2);
    expect(result.pagination.totalCount).toBe(2);
  });

  it("save() has no generic implementation and documents that clearly", async () => {
    const repo = new WidgetRepository(new FakeWidgetDelegate());
    await expect(repo.save({ id: "1", name: "x", deletedAt: null })).rejects.toThrow(/no generic implementation/);
  });
});

describe("PrismaRepository — soft delete", () => {
  it("softDelete sets the deletedAt column", async () => {
    const delegate = new FakeWidgetDelegate();
    delegate.seed({ id: "1", name: "A", deletedAt: null });
    const repo = new WidgetRepository(delegate);

    await repo.softDelete("1");
    expect(await repo.isDeleted("1")).toBe(true);
  });

  it("restore clears the deletedAt column", async () => {
    const delegate = new FakeWidgetDelegate();
    delegate.seed({ id: "1", name: "A", deletedAt: new Date() });
    const repo = new WidgetRepository(delegate);

    await repo.restore("1");
    expect(await repo.isDeleted("1")).toBe(false);
  });

  it("isDeleted is false for a record that doesn't exist at all", async () => {
    const repo = new WidgetRepository(new FakeWidgetDelegate());
    expect(await repo.isDeleted("missing")).toBe(false);
  });
});
