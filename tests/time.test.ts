import { describe, expect, it } from "vitest";
import { msUntilEight, parisTime, scheduleDecision, shiftDate } from "../src/lib/brief/time";

const at = (iso: string) => new Date(iso);

describe("8h00 à Paris, été comme hiver", () => {
  it("convertit l'heure UTC en heure de Paris", () => {
    expect(parisTime(at("2026-07-01T05:50:00Z"))).toMatchObject({ date: "2026-07-01", weekday: 3, hour: 7, minute: 50 });
    expect(parisTime(at("2026-12-01T06:50:00Z"))).toMatchObject({ date: "2026-12-01", weekday: 2, hour: 7, minute: 50 });
    expect(parisTime(at("2026-12-31T23:30:00Z"))).toMatchObject({ date: "2027-01-01", hour: 0 });
  });

  it("en été, le cron de 05:50 UTC génère et celui de 06:50 UTC ne refait rien", () => {
    expect(scheduleDecision(at("2026-07-01T05:50:00Z"), false)).toEqual({ run: true });
    expect(scheduleDecision(at("2026-07-01T06:50:00Z"), true)).toEqual({ run: false, reason: "le brief du 2026-07-01 existe déjà" });
  });

  it("en hiver, le cron de 05:50 UTC est trop tôt et celui de 06:50 UTC génère", () => {
    expect(scheduleDecision(at("2026-12-01T05:50:00Z"), false)).toMatchObject({ run: false, reason: expect.stringContaining("06h50") });
    expect(scheduleDecision(at("2026-12-01T06:50:00Z"), false)).toEqual({ run: true });
  });

  it("produit exactement un brief par jour ouvré toute l'année, changements d'heure compris", () => {
    for (let day = at("2026-01-01T00:00:00Z"); day.getUTCFullYear() === 2026; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = day.toISOString().slice(0, 10);
      let generated = false;
      let runs = 0;
      for (const cron of ["05:50", "06:50"]) {
        if (scheduleDecision(at(`${date}T${cron}:00Z`), generated).run) {
          runs++;
          generated = true;
        }
      }
      const weekend = [0, 6].includes(day.getUTCDay());
      expect(`${date} ${runs}`).toBe(`${date} ${weekend ? 0 : 1}`);
    }
  });

  it("rattrape un cron en retard, mais pas au-delà de 9h30", () => {
    expect(scheduleDecision(at("2026-07-01T07:10:00Z"), false)).toEqual({ run: true }); // 9h10
    expect(scheduleDecision(at("2026-07-01T07:40:00Z"), false).run).toBe(false); // 9h40
  });

  it("ne tourne pas le week-end", () => {
    expect(scheduleDecision(at("2026-11-14T06:50:00Z"), false)).toEqual({ run: false, reason: "week-end à Paris" });
  });

  it("calcule l'attente jusqu'à 8h00 pile", () => {
    expect(msUntilEight(at("2026-07-01T05:50:00Z"))).toBe(10 * 60_000);
    expect(msUntilEight(at("2026-12-01T06:59:30.500Z"))).toBe(29_500);
    expect(msUntilEight(at("2026-12-01T07:00:00Z"))).toBe(0);
    expect(msUntilEight(at("2026-12-01T07:20:00Z"))).toBe(0);
  });

  it("décale une date", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});
