// controllers\expenseController.ts
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Expense from '../models/expenseModel';

// @desc    Create a new expense for a property
// @route   POST /api/properties/:propertyId/expenses
// @access  Private (assume validation middleware or auth handled upstream)
export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const { amount, description, date } = req.body;

  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    res.status(400);
    throw new Error('Invalid property ID');
  }

  if (!amount || !description || !date) {
    res.status(400);
    throw new Error('All fields (amount, description, date) are required');
  }

  const expense = await Expense.create({
    propertyId,
    amount,
    description,
    date,
  });

  res.status(201).json(expense);
});

// @desc    Get all expenses for a property
// @route   GET /api/properties/:propertyId/expenses
// @access  Private
export const getExpensesByProperty = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    res.status(400);
    throw new Error('Invalid property ID');
  }

  const expenses = await Expense.find({ propertyId }).sort({ date: -1 });
  res.status(200).json(expenses);
});
