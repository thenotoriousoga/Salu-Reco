"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { InputGroup } from "@/shared/components/ui/InputGroup";
import { Icon } from "@/shared/icons/ic";
import { toast } from "@/shared/store/toast";
import { useLoadingStore } from "@/shared/store/loading";

/**
 * バックエンド `CreateEventRequest` と同じルールをクライアントでも検証する。
 */
const schema = z.object({
  name: z
    .string()
    .min(1, "イベント名を入力してください")
    .max(100, "イベント名は100文字以内です"),
  date: z.string().min(1, "開催日を入力してください"),
});

type FormValues = z.infer<typeof schema>;

type CreateResult = {
  eventId: string;
  joinCode: string;
};

async function postCreateEvent(values: FormValues): Promise<CreateResult> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `作成に失敗しました (${res.status})`);
  }
  return (await res.json()) as CreateResult;
}

/**
 * イベント作成フォーム。
 * 元: src/index.html の #page-create-event 内フォーム。
 */
export function CreateEventForm() {
  const router = useRouter();
  const loading = useLoadingStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "フットサル", date: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    loading.show("作成中...");
    try {
      const result = await postCreateEvent(values);
      toast.info(`参加コード: ${result.joinCode}`);
      router.push("/events");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      loading.hide();
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <InputGroup
        label="イベント名"
        htmlFor="create-ev-name"
        error={form.formState.errors.name?.message}
      >
        <Input
          id="create-ev-name"
          type="text"
          maxLength={100}
          {...form.register("name")}
        />
      </InputGroup>

      <InputGroup
        label="日付"
        htmlFor="create-ev-date"
        error={form.formState.errors.date?.message}
      >
        <Input id="create-ev-date" type="date" {...form.register("date")} />
      </InputGroup>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={form.formState.isSubmitting}
        leftIcon={<Icon name="check" size={18} className="btn-icon" />}
      >
        {form.formState.isSubmitting ? "作成中..." : "作成してはじめる"}
      </Button>
    </form>
  );
}
