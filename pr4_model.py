"""Reproducible teaching model for ATI.SU PR3–PR5, Python 3.10+, stdlib only.

Run: python pr4_model.py
Run checks: python pr4_model.py --check
Synthetic data are never historical ATI.SU measurements. No personal data used.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REVENUE = 1_475_795_000
ARPA = REVENUE / 100_000
N_REF = (REVENUE / 3) / ARPA
N_PILOT_PAID = 6 * 5_000 * .60  # 30k profiles do not equal 33,333 paid equivalents.
WEEKS_PER_MONTH = 52 / 12

# These records are synthetic test fixtures, not observations about the company.
PERIODS = [
    dict(period="2026-09-01/2026-09-14", role="calibration", n=1000,
         defective=200, churn=100, data_kind="synthetic"),
    dict(period="2026-09-15/2026-09-28", role="holdout", n=1200,
         defective=216, churn=118, data_kind="synthetic"),
]

RECOVERY_H = {
    "baseline": [2, 4, 6, 8, 12, 16, 24, 36, 48, 72],
    "expected": [1, 2, 3, 4, 6, 8, 10, 12, 18, 24],
    "pessimistic": [2, 4, 8, 12, 18, 24, 36, 48, 72, 96],
}
EXPERT_H = {
    "baseline": [2, 4, 8, 12, 16, 24, 32, 40, 56, 80],
    "expected": [0.5, 1, 2, 2, 3, 4, 4, 6, 8, 12],
    "pessimistic": [4, 8, 12, 16, 24, 32, 40, 56, 80, 120],
}

SCENARIOS = {
    "baseline": dict(defect_rate=.20, churn_given_defect=.50, recovery_reduction=0,
        knowledge_saving_rate=0, legal_weeks=4, technical_weeks=2,
        oneoff_multiplier=0, review_cost=0, recurring_annual=0,
        commercial_buyers=0, decommission_rate=0),
    "expected": dict(defect_rate=.14, churn_given_defect=.50, recovery_reduction=.40,
        knowledge_saving_rate=.05, legal_weeks=4, technical_weeks=12,
        oneoff_multiplier=1, review_cost=350_000, recurring_annual=1_128_000,
        commercial_buyers=4, decommission_rate=.065),
    "pessimistic": dict(defect_rate=.18, churn_given_defect=.50, recovery_reduction=.10,
        knowledge_saving_rate=.02, legal_weeks=12, technical_weeks=18,
        oneoff_multiplier=1.5, review_cost=700_000, recurring_annual=1_800_000,
        commercial_buyers=0, decommission_rate=.03),
}

ONEOFF = [
    ("pipeline_and_instrumentation", 240, 2_000, 0),
    ("legal_inventory_and_access", 160, 2_000, 0),
    ("billing_linkage_and_controls", 80, 2_000, 0),
    ("training_and_change_design", 80, 2_000, 0),
    ("knowledge_transfer_6_domains", 6 * 66, 2_000, 6 * 2_000),
    ("game_day_6_domains", 6 * 2, 2_000, 0),
]


def percentile(values, p):
    """Nearest rank. No interpolation. p=0.90 => ceil(0.9*n)-1."""
    if not values:
        return None
    return sorted(values)[max(0, math.ceil(p * len(values)) - 1)]


def stats(values):
    return dict(n=len(values), mean=sum(values)/len(values),
                p50=percentile(values, .5), p90=percentile(values, .9),
                maximum=max(values), data_kind="synthetic")


def portfolio():
    h1 = N_PILOT_PAID * (.20 - .14) * .50 * ARPA
    h3 = N_REF * .25 * .20 * .40 * ARPA
    raw = [h1, 40_000_000 * .05, h3, 4 * 1_200_000, 80_000_000 * .065]
    overlap_revenue = .20 * h3
    overlap_cost = 400_000
    revenue_net_overlap = h1 + h3 - overlap_revenue + raw[3]
    cost_net_overlap = raw[1] + raw[4] - overlap_cost
    gross = revenue_net_overlap + cost_net_overlap
    # Only 50% of H4 and 25% of H5 are realized in the first post-readiness year.
    # Core H1/H2/H3 starts after the 16-week gate+pilot, as in PR4.
    core = scenario("expected")
    first_year = core["first_year_incremental_net"]
    first_year += .5 * raw[3] * .8 - 600_000 - 600_000
    first_year += .25 * (raw[4] - overlap_cost) - 500_000 - 240_000
    recurring_portfolio = 1_128_000 + 600_000 + 240_000
    return dict(
        raw_improvements=raw, raw_sum=sum(raw), revenue_overlap=overlap_revenue,
        cost_overlap=overlap_cost, combined_revenue=revenue_net_overlap,
        combined_cost_saving=cost_net_overlap, gross_combined=gross,
        gross_combined_over_revenue_pct=100*gross/REVENUE,
        contribution_before_recurring=.8*revenue_net_overlap+cost_net_overlap,
        recurring_annual=recurring_portfolio,
        steady_net_contribution=.8*revenue_net_overlap+cost_net_overlap-recurring_portfolio,
        first_year_incremental_net=first_year,
        first_year_over_revenue_pct=100*first_year/REVENUE,
    )


def scenario(name):
    s = SCENARIOS[name]
    old_churn = .20 * .50
    new_churn = s["defect_rate"] * s["churn_given_defect"]
    h1 = N_PILOT_PAID * (old_churn-new_churn) * ARPA
    h3 = N_REF * .25 * .20 * s["recovery_reduction"] * ARPA
    h2 = 40_000_000 * s["knowledge_saving_rate"]
    retained = h1 + .8*h3  # 20% conservative overlap removed exactly once.
    contribution = .80*retained + h2
    annual_net = contribution - s["recurring_annual"]
    c0 = sum(hours*rate+other for _,hours,rate,other in ONEOFF)
    recovery_cap = .0015*REVENUE if name != "baseline" else 0
    nonparallel = c0*s["oneoff_multiplier"] + s["review_cost"] + recovery_cap
    weeks = s["legal_weeks"] + s["technical_weeks"]
    total_parallel = weeks/WEEKS_PER_MONTH*6_000_000
    # Same legal delay in comparator: legal hold is not attributed to small waves.
    extra_parallel = max(0, s["technical_weeks"]-2)/WEEKS_PER_MONTH*6_000_000
    incremental_upfront = nonparallel + extra_parallel
    full_pilot_cash = nonparallel + total_parallel
    readiness_month = weeks/WEEKS_PER_MONTH
    remaining_first_year = max(0, 12-readiness_month)
    first_year = annual_net*remaining_first_year/12 - incremental_upfront
    payback = readiness_month + incremental_upfront/(annual_net/12) if annual_net>0 else None
    full_payback = readiness_month + full_pilot_cash/(annual_net/12) if annual_net>0 else None
    n_month = 5_000 * .60
    return dict(name=name, parameters=s, annual_h1=h1, annual_h2=h2, annual_h3=h3,
        annual_revenue_retained=retained, annual_contribution=contribution,
        annual_net=annual_net, churn_rate=new_churn,
        baseline_churn_rate=old_churn, month_paid_n=n_month,
        month_churn_n=n_month*new_churn, month_retained_n=n_month*(1-new_churn),
        nonparallel_cost=nonparallel, parallel_total=total_parallel,
        incremental_parallel=extra_parallel, incremental_upfront=incremental_upfront,
        full_pilot_cash=full_pilot_cash, readiness_weeks=weeks,
        readiness_month=readiness_month, first_year_incremental_net=first_year,
        payback_month=payback, full_cash_payback_month=full_payback,
        payback_within_24_months=(payback is not None and payback<=24),
        recovery=stats(RECOVERY_H[name]), expert=stats(EXPERT_H[name]),
    )


def validate_fixture():
    train,test=PERIODS
    k=train["churn"]/train["defective"]
    predicted=test["defective"]*k
    return dict(data_kind="synthetic_only_not_company_history", coefficient=k,
        train=train, holdout=test, predicted_churn=predicted,
        actual_fixture_churn=test["churn"], error_count=predicted-test["churn"],
        absolute_percentage_error=100*abs(predicted-test["churn"])/test["churn"],
        rate_error_pp=100*(predicted-test["churn"])/test["n"],
        real_history_validation="NOT_PERFORMED_NO_COMPANY_EXTRACTS")


def sample_size(p1=.10,p2=.07,alpha_z=1.96,power_z=.84):
    p=(p1+p2)/2
    return math.ceil(((alpha_z*math.sqrt(2*p*(1-p))+
                       power_z*math.sqrt(p1*(1-p1)+p2*(1-p2)))**2)/(p1-p2)**2)


def export_csv(path, rows):
    with path.open("w",encoding="utf-8-sig",newline="") as out:
        writer=csv.DictWriter(out,fieldnames=list(rows[0]))
        writer.writeheader();writer.writerows(rows)


def main(check=False):
    results={n:scenario(n) for n in SCENARIOS}
    result=dict(status="TEACHING_MODEL_NOT_OBSERVED_EFFECT", revenue=REVENUE,
        arpa_reference=ARPA, paid_equivalent_reference=N_REF, pilot_paid_equivalents=N_PILOT_PAID,
        weeks_per_month=WEEKS_PER_MONTH, scenarios=results,
        validation=validate_fixture(), portfolio=portfolio(),
        pilot_n_per_arm=sample_size())
    if check:
        assert abs(results["expected"]["annual_h1"]-7_969_293)<.01
        assert results["expected"]["payback_within_24_months"]
        assert not results["pessimistic"]["payback_within_24_months"]
        assert result["portfolio"]["gross_combined"] < result["portfolio"]["raw_sum"]
        assert result["validation"]["train"]["period"] != result["validation"]["holdout"]["period"]
        assert result["validation"]["real_history_validation"].startswith("NOT_PERFORMED")
        assert percentile([2,4,6,8,12,16,24,36,48,72],.9)==48
        assert math.isclose(results["expected"]["month_churn_n"],210)
        print("PASS: calculations, overlap, periods, quantiles, conditional forecast; real historical validation unavailable")
        return
    (ROOT/"pr4_model_results.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    export_csv(ROOT/"pr4_scenario_results.csv",[
        {k:v for k,v in row.items() if k not in ("parameters","recovery","expert")}
        for row in results.values()])
    export_csv(ROOT/"pr4_synthetic_periods.csv",PERIODS)
    export_csv(ROOT/"pr4_synthetic_distributions.csv",[
        dict(data_kind="synthetic",metric=metric,scenario=name,case=i+1,hours=value)
        for metric,groups in [("ticket_to_fix",RECOVERY_H),("expert_wait",EXPERT_H)]
        for name,values in groups.items() for i,value in enumerate(values)])
    print(json.dumps(dict(expected=results["expected"],pessimistic=results["pessimistic"],
                         portfolio=result["portfolio"],pilot_n_per_arm=sample_size()),ensure_ascii=False,indent=2))


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check",action="store_true")
    main(parser.parse_args().check)
