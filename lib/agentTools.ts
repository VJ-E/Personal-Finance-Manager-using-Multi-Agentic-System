import { tool } from "ai";
import { z } from "zod";
import { addTransaction, getFinancialSummary, deleteTransaction, updateTransaction, createGoal, fundGoal } from "./financialTools";

// Shared tools object - ONLY accessible by Backend Operations Agent
export const agentTools = {
    get_financial_data: tool({
        description: "Fetches the user's current bank balance, income, savings goals, and recent transaction history from the database.",
        parameters: z.object({
            userId: z.string().describe("The user ID to fetch data for")
        }),
        execute: async ({ userId }) => {
            return await getFinancialSummary(userId);
        },
    }),
    add_transaction: tool({
        description: "Inserts a new transaction into the database. Do not calculate the balance; the system does this automatically.",
        parameters: z.object({
            userId: z.string().describe("The user ID to add transaction for"),
            description: z.string().describe("What the transaction was for (e.g., 'Groceries', 'Salary')"),
            amount: z.number().describe("The absolute numerical amount of the transaction. Never negative."),
            category: z.enum(["Fixed", "Variable", "Income"]).describe("The category mapping. 'Fixed' or 'Variable' for expenses, 'Income' for earnings.")
        }),
        execute: async ({ userId, description, amount, category }) => {
            return await addTransaction(userId, description, amount, category);
        }
    }),
    delete_transaction: tool({
        description: "Deletes a transaction by ID. The balance is automatically recalculated by the system.",
        parameters: z.object({
            userId: z.string().describe("The user ID to delete transaction for"),
            transactionId: z.string().describe("The exact ID of the transaction to delete"),
        }),
        execute: async ({ userId, transactionId }) => {
            return await deleteTransaction(userId, transactionId);
        }
    }),
    update_transaction: tool({
        description: "Updates an existing transaction. Only provide the fields that need changing. The balance is automatically corrected.",
        parameters: z.object({
            userId: z.string().describe("The user ID to update transaction for"),
            transactionId: z.string().describe("The exact ID of the transaction to update"),
            newAmount: z.number().optional().describe("The new absolute amount (if changing)."),
            newDescription: z.string().optional().describe("The new description (if changing)."),
            newCategory: z.enum(["Fixed", "Variable", "Income"]).optional().describe("The new category (if changing).")
        }),
        execute: async ({ userId, transactionId, newAmount, newDescription, newCategory }) => {
            return await updateTransaction(userId, transactionId, newAmount, newDescription, newCategory);
        }
    }),
    create_goal: tool({
        description: "Creates a new savings goal or vault for the user to fund. Provides a short ID for the vault.",
        parameters: z.object({
            userId: z.string().describe("The user ID to create goal for"),
            title: z.string().describe("The title or name of the savings goal (e.g., 'Vacation', 'New Car')."),
            targetAmount: z.number().describe("The explicit target financial amount the user aims to hit for this goal.")
        }),
        execute: async ({ userId, title, targetAmount }) => {
            return await createGoal(userId, title, targetAmount);
        }
    }),
    fund_goal: tool({
        description: "Transfers capital from the user's total balance specifically into one of their active savings goals.",
        parameters: z.object({
            userId: z.string().describe("The user ID to fund goal for"),
            shortId: z.string().describe("The exact 4-character short ID of the savings goal to fund."),
            amount: z.number().describe("The numerical amount to transfer out of the total balance and into this goal.")
        }),
        execute: async ({ userId, shortId, amount }) => {
            return await fundGoal(userId, shortId, amount);
        }
    })
};
