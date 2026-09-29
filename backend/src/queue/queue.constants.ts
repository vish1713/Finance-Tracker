export const QUEUE_NAMES = {
  RECURRING_TRANSACTIONS: 'recurring-transactions',
  BILL_REMINDERS: 'bill-reminders',
  BUDGET_ALERTS: 'budget-alerts',
  EMAIL: 'email',
} as const;

export const JOB_NAMES = {
  PROCESS_DUE_RECURRING: 'process-due-recurring',
  PROCESS_ONE_RECURRING: 'process-one-recurring',
  SCAN_BILL_REMINDERS: 'scan-bill-reminders',
  CHECK_BUDGET_ALERT: 'check-budget-alert',
  SEND_EMAIL: 'send-email',
} as const;
