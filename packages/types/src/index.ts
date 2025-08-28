import { z } from 'zod';

// Example Zod Schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  // Add other user fields as needed
});

export const CurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string(),
  decimals: z.number().int().min(0),
});

export const AccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  currencyCode: z.string().length(3),
  type: z.string().min(1), // e.g., 'cash', 'bank'
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CategorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  icon: z.string().nullable(),
});

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  type: z.enum(['income', 'expense', 'transfer']),
  amountOriginal: z.number(), // Use number for Zod, convert to Decimal for Prisma
  currencyOriginal: z.string().length(3),
  amountBase: z.number(),
  currencyBase: z.string().length(3),
  tags: z.array(z.string()),
  memo: z.string().nullable(),
  txDate: z.string().datetime(), // Date string
  createdAt: z.string().datetime(),
});

export const HoldingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string().min(1),
  exchange: z.string().min(1),
  quantity: z.number(),
  avgCost: z.number(),
  currencyCode: z.string().length(3),
  note: z.string().nullable(),
});

export const PriceSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().min(1),
  exchange: z.string().min(1),
  price: z.number(),
  currencyCode: z.string().length(3),
  asOf: z.string().datetime(),
});

export const SettingSchema = z.object({
  userId: z.string().uuid(),
  baseCurrency: z.string().length(3),
  displayCurrencies: z.array(z.string().length(3)),
  locale: z.string().min(1),
  roundingRule: z.string().nullable(),
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  dueDate: z.string().datetime(),
  status: z.enum(['todo', 'in_progress', 'done']),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Infer TypeScript types from Zod schemas
export type User = z.infer<typeof UserSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type Account = z.infer<typeof AccountSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Holding = z.infer<typeof HoldingSchema>;
export type Price = z.infer<typeof PriceSchema>;
export type Setting = z.infer<typeof SettingSchema>;
export type Task = z.infer<typeof TaskSchema>;