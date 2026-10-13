import { updateGlobalSettings } from "@/actions/catalogue";
import { RulesFields } from "@/components/features/RulesFields";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Card } from "@/components/ui/Card";
import { getGlobalSettings } from "@/server/rules";
import { pageUser } from "@/server/session";

export default async function SettingsPage() {
  await pageUser("settings:manage");
  const g = await getGlobalSettings();
  return (
    <>
      <PageHeader title="Global settings" subtitle="Organisation-wide defaults. Types and resources inherit these unless they override a rule. Existing bookings keep the buffer and cancel cut-off they were made with." />
      <Card>
        <ActionForm action={updateGlobalSettings} successMessage="Settings saved" className="stack">
          <RulesFields values={g} optional={false} />
          <div><SubmitButton>Save settings</SubmitButton></div>
        </ActionForm>
      </Card>
    </>
  );
}
