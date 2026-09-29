'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/lib/queries/categories';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/queries/notifications';
import { useChangePassword, useUpdateProfile } from '@/lib/queries/users';
import { formatDate } from '@/lib/format';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  baseCurrency: z.string().min(1).max(10),
  timezone: z.string().min(1).max(60),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Must be at least 8 characters').max(72),
});
type PasswordForm = z.infer<typeof passwordSchema>;

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  type: z.enum(['INCOME', 'EXPENSE']),
});
type CategoryForm = z.infer<typeof categorySchema>;

function ProfileSection() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: user
      ? { name: user.name, baseCurrency: user.baseCurrency, timezone: user.timezone }
      : undefined,
  });

  return (
    <Card>
      <h2 className="mb-4 text-sm font-medium text-slate-900">Profile</h2>
      <form onSubmit={handleSubmit((values) => updateProfile.mutate(values))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Base Currency</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('baseCurrency')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Timezone</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('timezone')}
            />
          </div>
        </div>
        {updateProfile.isSuccess && <p className="text-xs text-green-700">Profile updated.</p>}
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  return (
    <Card>
      <h2 className="mb-4 text-sm font-medium text-slate-900">Change Password</h2>
      <form
        onSubmit={handleSubmit((values) =>
          changePassword.mutate(values, { onSuccess: () => reset() }),
        )}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Current Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('currentPassword')}
          />
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">New Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
          )}
        </div>
        {changePassword.isError && (
          <p className="text-xs text-red-600">
            Could not update password. Check your current password.
          </p>
        )}
        {changePassword.isSuccess && <p className="text-xs text-green-700">Password changed.</p>}
        <button
          type="submit"
          disabled={changePassword.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {changePassword.isPending ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </Card>
  );
}

function CategoriesSection() {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: 'EXPENSE' },
  });

  const customCategories = categories?.filter((c) => c.userId !== null) ?? [];

  return (
    <Card>
      <h2 className="mb-4 text-sm font-medium text-slate-900">Custom Categories</h2>
      <form
        onSubmit={handleSubmit(async (values) => {
          await createCategory.mutateAsync(values);
          reset({ name: '', type: values.type });
        })}
        className="mb-4 flex gap-2"
      >
        <input
          placeholder="Category name"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          {...register('name')}
        />
        <select
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          {...register('type')}
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
        <button
          type="submit"
          disabled={createCategory.isPending}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {errors.name && <p className="mb-2 text-xs text-red-600">{errors.name.message}</p>}

      {customCategories.length === 0 ? (
        <p className="text-sm text-slate-500">
          No custom categories yet — you&apos;re using the built-in defaults.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {customCategories.map((category) => (
            <li key={category.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-900">
                {category.name}{' '}
                <span className="text-xs text-slate-400 capitalize">
                  ({category.type.toLowerCase()})
                </span>
              </span>
              <button
                onClick={() => deleteCategory.mutate(category.id)}
                className="text-xs font-medium text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NotificationsSection() {
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-900">Notifications</h2>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Mark all read
          </button>
        )}
      </div>
      {!notifications || notifications.length === 0 ? (
        <p className="text-sm text-slate-500">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {notifications.slice(0, 10).map((n) => (
            <li key={n.id} className="py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={n.isRead ? 'text-slate-600' : 'font-medium text-slate-900'}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500">{n.message}</p>
                  <p className="text-xs text-slate-400">{formatDate(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your profile, categories, and notifications.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileSection />
        <PasswordSection />
        <CategoriesSection />
        <NotificationsSection />
      </div>
    </div>
  );
}
