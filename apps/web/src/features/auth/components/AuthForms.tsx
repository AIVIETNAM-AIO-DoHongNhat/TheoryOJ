"use client";

import { ArrowRight, CheckCircle2, CircleAlert, Eye, EyeOff, IdCard, KeyRound, type LucideIcon, Users, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { changePassword, login, register, saveProfile } from "../actions";
import { safeNext } from "../next";
import type { FormState } from "../schemas";
import { playAuthTransition } from "./AuthTransition";

const noSubscribe = () => () => {};

/**
 * Đích chuyển tiếp (?tiep=) đọc ngay ở trình duyệt, để form đăng nhập, đăng ký nằm trong khung tĩnh của trang và hiện
 * tức thì, không phải chờ máy chủ đọc searchParams (trước đây form thay cho khung xương sau vài trăm mili giây, trang nhảy).
 * Lần dựng ở máy chủ và lúc hydrate dùng "/hoc"; Server Action vẫn lọc lại bằng safeNext.
 */
function useNextParam(): string {
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
  return safeNext(new URLSearchParams(search).get("tiep") ?? undefined);
}

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
      <InputGroup className="h-11 bg-card">
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

/**
 * Ô nhập kính mờ của trang đăng nhập, đăng ký: viền và nền đổi sang màu xanh khi đang gõ, sang đỏ khi có lỗi.
 * Ô mật khẩu có nút hiện/ẩn. Giá trị cũ điền lại khi máy chủ báo lỗi (trừ mật khẩu).
 */
function GlassField({ name, label, state, icon: Icon, description, type, className, ...props }: TextFieldProps) {
  const [shown, setShown] = useState(false);
  const error = state.errors?.[name];
  const id = `tk-${name}`;
  const hintId = `${id}-ghi-chu`;
  const password = type === "password";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div
        className={cn(
          "group/glass relative flex items-center rounded-2xl border border-border bg-foreground/3 backdrop-blur-sm transition-colors",
          "focus-within:border-primary/60 focus-within:bg-primary/5 focus-within:ring-3 focus-within:ring-primary/10",
          error &&
            "border-destructive/50 bg-destructive/5 focus-within:border-destructive/60 focus-within:bg-destructive/5 focus-within:ring-destructive/10",
        )}
      >
        {Icon && (
          <Icon
            aria-hidden
            className={cn(
              // z-10: ô tự điền phủ nền trắng lên cả input, biểu tượng phải nằm trên lớp đó.
              "pointer-events-none absolute left-4 z-10 size-4.5 text-muted-foreground transition-colors group-focus-within/glass:text-primary",
              error && "text-destructive group-focus-within/glass:text-destructive",
            )}
          />
        )}
        <input
          id={id}
          name={name}
          type={password && shown ? "text" : type}
          aria-invalid={!!error || undefined}
          aria-describedby={error || description ? hintId : undefined}
          defaultValue={password ? undefined : state.values?.[name]}
          className={cn(
            "h-14 w-full min-w-0 rounded-2xl bg-transparent px-4 text-[15px] outline-none placeholder:text-muted-foreground/70",
            Icon && "pl-11",
            password && "pr-14",
          )}
          {...props}
        />
        {password && (
          <button
            type="button"
            aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
            className="absolute right-2 z-10 grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={hintId} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        description && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )
      )}
    </div>
  );
}

/** Dòng chuyển sang trang còn lại (đăng nhập hoặc đăng ký) ở cuối form, giữ đích chuyển tiếp. */
function AuthSwitch({ current, next, className }: { current: "dang-nhap" | "dang-ky"; next: string; className?: string }) {
  const login = current === "dang-nhap";
  return (
    <p className={cn("text-center text-sm text-muted-foreground", className)}>
      {login ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
      <Link
        href={`/${login ? "dang-ky" : "dang-nhap"}?tiep=${encodeURIComponent(next)}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {login ? "Đăng ký ngay" : "Đăng nhập"}
      </Link>
    </p>
  );
}

function FormMessage({ state, className }: { state: FormState; className?: string }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.ok ? "default" : "destructive"} className={className}>
      {state.ok ? <CheckCircle2 /> : <CircleAlert />}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

/** Nút gửi. `primary`: nút chính của trang đăng nhập, đăng ký, rộng hết thẻ, có mũi tên. */
function SubmitButton({
  pending,
  primary,
  className,
  children,
}: {
  pending: boolean;
  primary?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
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
      className={cn(
        "group/submit h-14 w-full rounded-2xl text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/35",
        className,
      )}
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

/**
 * Bọc Server Action đăng nhập, đăng ký: thành công thì mở màn chào mừng ngay khi có kết quả. Gọi ở đây chứ không trong
 * effect của form, vì cookie phiên vừa đặt khiến Next dựng lại trang và form có thể đã bị gỡ trước khi effect kịp chạy.
 */
function withWelcome(kind: "login" | "register", act: (prev: FormState, form: FormData) => Promise<FormState>) {
  return async (prev: FormState, form: FormData): Promise<FormState> => {
    const res = await act(prev, form);
    if (res.ok && res.to) playAuthTransition({ kind, fullName: res.fullName, to: res.to });
    return res;
  };
}
const loginWithWelcome = withWelcome("login", login);
const registerWithWelcome = withWelcome("register", register);

export function LoginForm() {
  const next = useNextParam();
  const [state, action, pending] = useActionState(loginWithWelcome, empty);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} className="animate-rise rounded-2xl" />
      <GlassField
        name="studentCode"
        label="Mã học viên"
        icon={IdCard}
        state={state}
        placeholder="Ví dụ: B2K60-001"
        autoComplete="username"
        autoCapitalize="characters"
        required
        className="animate-rise anim-delay-80"
      />
      <GlassField
        name="password"
        label="Mật khẩu"
        icon={KeyRound}
        state={state}
        type="password"
        placeholder="Nhập mật khẩu"
        autoComplete="current-password"
        required
        className="animate-rise anim-delay-120"
      />
      <p className="animate-rise anim-delay-160 -mt-1 text-right text-sm text-muted-foreground">
        Quên mật khẩu? <span className="text-foreground/85">Liên hệ giảng viên để được đặt lại.</span>
      </p>
      <SubmitButton pending={pending} primary className="animate-rise anim-delay-200">
        Đăng nhập
      </SubmitButton>
      <AuthSwitch current="dang-nhap" next={next} className="animate-rise anim-delay-240 pt-1" />
    </form>
  );
}

export function RegisterForm() {
  const next = useNextParam();
  const [state, action, pending] = useActionState(registerWithWelcome, empty);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} className="animate-rise rounded-2xl" />
      <GlassField
        name="studentCode"
        label="Mã học viên"
        icon={IdCard}
        state={state}
        placeholder="Ví dụ: B2K60-001"
        autoComplete="username"
        autoCapitalize="characters"
        required
        description="Dùng để đăng nhập, không đổi được sau khi đăng ký."
        className="animate-rise anim-delay-80"
      />
      <div className="animate-rise anim-delay-120 grid gap-5 sm:grid-cols-[1.5fr_1fr]">
        <GlassField name="fullName" label="Họ và tên" icon={UserRound} state={state} placeholder="Nguyễn Văn A" autoComplete="name" required />
        <GlassField name="className" label="Lớp" icon={Users} state={state} placeholder="B2K60" required />
      </div>
      <GlassField
        name="password"
        label="Mật khẩu"
        icon={KeyRound}
        state={state}
        type="password"
        placeholder="Tối thiểu 8 ký tự"
        autoComplete="new-password"
        required
        className="animate-rise anim-delay-160"
      />
      <GlassField
        name="confirm"
        label="Nhập lại mật khẩu"
        icon={KeyRound}
        state={state}
        type="password"
        placeholder="Gõ lại mật khẩu ở trên"
        autoComplete="new-password"
        required
        className="animate-rise anim-delay-200"
      />
      <SubmitButton pending={pending} primary className="animate-rise anim-delay-240 mt-1">
        Tạo tài khoản
      </SubmitButton>
      <p className="animate-rise anim-delay-280 text-center text-xs leading-relaxed text-muted-foreground">
        Tài khoản chỉ lưu mã học viên, họ tên và lớp để ghi nhận tiến độ học tập.
      </p>
      <AuthSwitch current="dang-ky" next={next} className="animate-rise anim-delay-320" />
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
