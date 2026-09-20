/**
 * Migration 005: Salesman & Customer Denormalization Schema
 * Adds salesman_name and customer_name to sales table for direct persistence and fast reporting.
 */

export const MIGRATION_005_VERSION = 5;
export const MIGRATION_005_NAME = 'salesman_and_customer_denorm';

export const MIGRATION_005_STATEMENTS = [
  `ALTER TABLE sales ADD COLUMN salesman_name TEXT;`,
  `ALTER TABLE sales ADD COLUMN customer_name TEXT;`,
];
