export async function setupUser() {
  const response = await fetch("/api/onboarding/setup", {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to set up your workspace.");
  }
}
