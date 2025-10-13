import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your Dream job!" },
  ];
}

export default function Home() {
  return (
    <main>
      <section className="main-section">
        <div className="page-heading">
          {" "}
          <h1> Track your Appliication & Resume Ratings</h1>
          <h2> Review your submissions and check AI-powered feedback.</h2>
        </div>
      </section>
    </main>
  );
}
