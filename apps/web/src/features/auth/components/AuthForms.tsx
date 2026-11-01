"use client";

import { ArrowRight, CheckCircle2, CircleAlert, Eye, EyeOff, IdCard, KeyRound, type LucideIcon, Users, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { changePassword, login, register, saveProfile } from "../actions";
import type { FormState } from "../schemas";

interface TextFieldProps extends Omit<React.ComponentProps<typeof InputGroupInput>, "name"> {
  name: string;
  label: string;
  state: FormState;
  icon?: LucideIcon;
  description?: React.ReactNode;
}

/**
 * Một ô nhập kèm biểu tượng, nhãn và lỗi của trường đó. Ô mật khẩu có nút hiện/ẩn.
 * Giá trị cũ điền lại khi máy chủ báo lỗi (trừ mật khẩu).
 */
function TextField({ name, label, state, icon: Icon, description, type, ...props }: TextFieldProps) {
  const [shown, setShown] = useState(false);
  const error = state.errors?.[name];
  const id = `tk-${name}`;
  const password = type === "password";
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className="h-11 bg-white">
        {Icon && (
          <InputGroupAddon>
            <Icon />
          </InputGroupAddon>
        )}
        <InputGroupInput
          id={id}
          name={name}
          type={password && shown ? "text" : type}
          aria-invalid={!!error || undefined}
          defaultValue={password ? undefined : state.values?.[name]}
          className="text-[15px]"
          {...props}
        />
        {password && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={shown}
              onClick={() => setShown((v) => !v)}
            >
              {shown ? <EyeOff /> : <Eye />}
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** Hai nút chuyển qua lại giữa Đăng nhập và Đăng ký, giữ đích chuyển tiếp. */
function AuthSwitch({ current, next }: { current: "dang-nhap" | "dang-ky"; next: string }) {
  const tabs = [
    { id: "dang-nhap", label: "Đăng nhập" },
    { id: "dang-ky", label: "Đăng ký" },
  ] as const;
  return (
    <nav aria-label="Đăng nhập hoặc đăng ký" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      {tabs.map((t) => (
        <Button
          key={t.id}
          variant="ghost"
          render={<Link href={`/${t.id}?tiep=${encodeURIComponent(next)}`} />}
          nativeButton={false}
          aria-current={t.id === current ? "page" : undefined}
          className={cn(
            "h-9 rounded-lg text-muted-foreground",
            t.id === current && "bg-white text-foreground shadow-sm hover:bg-white",
          )}
        >
          {t.label}
        </Button>
      ))}
    </nav>
  );
}

function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.ok ? "default" : "destructive"}>
      {state.ok ? <CheckCircle2 /> : <CircleAlert />}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

/** Nút gửi. `primary`: nút chính của trang đăng nhập, đăng ký, rộng hết thẻ, có mũi tên. */
function SubmitButton({ pending, primary, children }: { pending: boolean; primary?: boolean; children: React.ReactNode }) {
  if (!primary) {
    return (
      <Button type="submit" size="lg" disabled={pending} className="h-11 text-[15px]">
        {pending && <Spinner data-icon="inline-start" />}
        {children}
      </Button>
    );
  }
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="group/submit h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40"
    >
      {children}
      {pending ? (
        <Spinner data-icon="inline-end" />
      ) : (
        <ArrowRight data-icon="inline-end" className="transition-transform group-hover/submit:translate-x-0.5" />
      )}
    </Button>
  );
}

const empty: FormState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, empty);
  return (
    <form action={action} className="flex flex-col gap-6">
      <AuthSwitch current="dang-nhap" next={next} />
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <FieldGroup className="gap-5">
        <TextField
          name="studentCode"
          label="Mã học viên"
          icon={IdCard}
          state={state}
          placeholder="Ví dụ: B2K60-001"
          autoComplete="username"
          autoCapitalize="characters"
          required
        />
        <TextField name="password" label="Mật khẩu" icon={KeyRound} state={state} type="password" autoComplete="current-password" required />
      </FieldGroup>
      <SubmitButton pending={pending} primary>Đăng nhập</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">Quên mật khẩu? Liên hệ giảng viên để được đặt lại.</p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, empty);
  return (
    <form action={action} className="flex flex-col gap-6">
      <AuthSwitch current="dang-ky" next={next} />
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <FieldGroup className="gap-5">
        <TextField
          name="studentCode"
          label="Mã học viên"
          icon={IdCard}
          state={state}
          placeholder="Ví dụ: B2K60-001"
          autoComplete="username"
          autoCapitalize="characters"
          required
          description="Dùng để đăng nhập, không đổi được sau khi đăng ký."
        />
        <div className="grid gap-5 sm:grid-cols-[1.5fr_1fr]">
          <TextField name="fullName" label="Họ và tên" icon={UserRound} state={state} autoComplete="name" required />
          <TextField name="className" label="Lớp" icon={Users} state={state} placeholder="B2K60" required />
        </div>
        <TextField
          name="password"
          label="Mật khẩu"
          icon={KeyRound}
          state={state}
          type="password"
          autoComplete="new-password"
          required
          description="Tối thiểu 8 ký tự."
        />
        <TextField name="confirm" label="Nhập lại mật khẩu" icon={KeyRound} state={state} type="password" autoComplete="new-password" required />
      </FieldGroup>
      <SubmitButton pending={pending} primary>Tạo tài khoản</SubmitButton>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Tài khoản chỉ lưu mã học viên, họ tên và lớp để ghi nhận tiến độ học tập.
      </p>
    </form>
  );
}

export function ProfileForm({ fullName, className }: { fullName: string; className: string }) {
  const [state, action, pending] = useActionState(saveProfile, { values: { fullName, className } });
  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      <FieldGroup>
        <TextField name="fullName" label="Họ và tên" state={state} autoComplete="name" required />
        <TextField name="className" label="Lớp" state={state} required />
      </FieldGroup>
      <div>
        <SubmitButton pending={pending}>Lưu thông tin</SubmitButton>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, empty);
  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      <FieldGroup>
        <TextField name="current" label="Mật khẩu hiện tại" state={state} type="password" autoComplete="current-password" required />
        <TextField name="password" label="Mật khẩu mới" state={state} type="password" autoComplete="new-password" required />
        <TextField name="confirm" label="Nhập lại mật khẩu mới" state={state} type="password" autoComplete="new-password" required />
      </FieldGroup>
      <div>
        <SubmitButton pending={pending}>Đổi mật khẩu</SubmitButton>
      </div>
    </form>
  );
}
