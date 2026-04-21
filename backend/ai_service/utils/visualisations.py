# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
"""
Visualisation Utilities
========================
Generates matplotlib/seaborn figures for the technical report and
the admin/producer dashboards.

All figures use the BRFN brand colour palette:
  Primary green: #1A5C38
  Mid green:     #4CAF7D
  Light green:   #D6EFE1

Consistent style, size, and DPI ensure figures are print-ready for
the submitted technical report (Criterion 4, 20% of marks).
"""

import base64
import io
import logging

logger = logging.getLogger(__name__)

# Brand colour palette.
BRAND_COLOURS = ["#1A5C38", "#4CAF7D", "#D6EFE1"]
FIGURE_SIZE_WIDE = (10, 6)
FIGURE_SIZE_SQUARE = (8, 8)
DPI = 150


def _fig_to_b64(fig):
    """Convert a matplotlib Figure to a base64-encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=DPI, bbox_inches="tight")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _save_or_b64(fig, save_path):
    """Save figure to disk if save_path given, else return base64."""
    if save_path:
        fig.savefig(save_path, dpi=DPI, bbox_inches="tight")
        return save_path
    return _fig_to_b64(fig)


def plot_grade_distribution(assessments_qs, save_path=None):
    """
    Pie/donut chart of Grade A/B/C distribution.

    Args:
        assessments_qs: QuerySet of QualityAssessment records.
        save_path (str | None): File path to save PNG, or None for base64.

    Returns:
        str: File path or base64 string.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    counts = {g: assessments_qs.filter(overall_grade=g).count()
              for g in ["A", "B", "C"]}
    labels = [f"Grade {g} ({counts[g]})" for g in ["A", "B", "C"]]
    sizes = [counts[g] for g in ["A", "B", "C"]]

    fig, ax = plt.subplots(figsize=FIGURE_SIZE_SQUARE)
    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=labels,
        autopct="%1.1f%%",
        colors=BRAND_COLOURS,
        startangle=140,
        wedgeprops={"width": 0.6},  # Donut style.
    )
    for t in autotexts:
        t.set_fontsize(11)
    ax.set_title(
        "Quality Grade Distribution", fontsize=14, fontweight="bold",
        color="#1A5C38"
    )
    result = _save_or_b64(fig, save_path)
    plt.close(fig)
    return result


def plot_score_distributions(assessments_qs, save_path=None):
    """
    Box plots of colour/size/ripeness scores grouped by grade.

    Args:
        assessments_qs: QuerySet of QualityAssessment records.
        save_path (str | None): File path or None for base64.

    Returns:
        str: File path or base64 string.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    grades = ["A", "B", "C"]
    attrs = ["colour_score", "size_score", "ripeness_score"]
    attr_labels = ["Colour", "Size", "Ripeness"]

    fig, axes = plt.subplots(1, 3, figsize=(15, 6), sharey=True)
    fig.suptitle(
        "Score Distributions by Grade", fontsize=14, fontweight="bold",
        color="#1A5C38"
    )

    for ax, attr, label in zip(axes, attrs, attr_labels):
        data_by_grade = [
            list(assessments_qs.filter(
                overall_grade=g
            ).values_list(attr, flat=True))
            for g in grades
        ]
        bp = ax.boxplot(
            data_by_grade,
            labels=grades,
            patch_artist=True,
        )
        for patch, colour in zip(bp["boxes"], BRAND_COLOURS):
            patch.set_facecolor(colour)
        ax.set_title(label)
        ax.set_xlabel("Grade")
        ax.set_ylabel("Score (0–100)" if attr == "colour_score" else "")

    result = _save_or_b64(fig, save_path)
    plt.close(fig)
    return result


def plot_recommendation_performance(logs_qs, save_path=None):
    """
    Stacked bar of recommendations made vs accepted vs overridden per week.

    Args:
        logs_qs: QuerySet of RecommendationLog records.
        save_path (str | None): File path or None for base64.

    Returns:
        str: File path or base64 string.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from django.db.models import Count
    from ai_service.models import ProductInteraction

    # Weekly recommendation counts.
    from django.db.models.functions import TruncWeek
    weekly = (
        logs_qs.annotate(week=TruncWeek("created_at"))
        .values("week")
        .annotate(count=Count("id"))
        .order_by("week")[:8]
    )
    weeks = [row["week"].strftime("%d %b") for row in weekly]
    rec_counts = [row["count"] for row in weekly]

    fig, ax = plt.subplots(figsize=FIGURE_SIZE_WIDE)
    ax.bar(weeks, rec_counts, color="#1A5C38", label="Recommendations made")
    ax.set_title(
        "Weekly Recommendation Volume", fontsize=14, fontweight="bold",
        color="#1A5C38"
    )
    ax.set_xlabel("Week")
    ax.set_ylabel("Count")
    ax.legend()

    result = _save_or_b64(fig, save_path)
    plt.close(fig)
    return result


def plot_quality_trend(assessments_qs, producer=None, save_path=None):
    """
    Line chart of weekly average quality score.

    Args:
        assessments_qs: QuerySet of QualityAssessment records.
        producer: Optional User — if given, overlay their trend vs network.
        save_path (str | None): File path or None for base64.

    Returns:
        str: File path or base64 string.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from django.db.models import Avg
    from django.db.models.functions import TruncWeek

    def _weekly_avg(qs):
        rows = (
            qs.annotate(week=TruncWeek("assessed_at"))
            .values("week")
            .annotate(
                avg=Avg("colour_score")
                + Avg("size_score")
                + Avg("ripeness_score")
            )
            .order_by("week")[:12]
        )
        return (
            [r["week"].strftime("%d %b") for r in rows],
            [round((r["avg"] or 0) / 3, 1) for r in rows],
        )

    fig, ax = plt.subplots(figsize=FIGURE_SIZE_WIDE)

    net_weeks, net_avg = _weekly_avg(assessments_qs)
    if net_weeks:
        ax.plot(net_weeks, net_avg, color="#4CAF7D", marker="o",
                label="Network average", linewidth=2)

    if producer:
        from ai_service.models import QualityAssessment
        prod_qs = QualityAssessment.objects.filter(producer=producer)
        prod_weeks, prod_avg = _weekly_avg(prod_qs)
        if prod_weeks:
            ax.plot(prod_weeks, prod_avg, color="#1A5C38", marker="s",
                    label=f"{producer.get_full_name()} trend", linewidth=2)

    ax.set_title(
        "Quality Score Trend (Weekly Average)", fontsize=14,
        fontweight="bold", color="#1A5C38"
    )
    ax.set_xlabel("Week")
    ax.set_ylabel("Composite Score (0–100)")
    ax.legend()
    plt.xticks(rotation=30)

    result = _save_or_b64(fig, save_path)
    plt.close(fig)
    return result


def plot_confusion_matrix(cm_data, save_path=None):
    """
    Heatmap of the grade prediction confusion matrix.

    Args:
        cm_data (list[list[int]]): 3×3 matrix [A, B, C].
        save_path (str | None): File path or None for base64.

    Returns:
        str: File path or base64 string.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import seaborn as sns

    labels = ["Grade A", "Grade B", "Grade C"]
    fig, ax = plt.subplots(figsize=FIGURE_SIZE_SQUARE)
    sns.heatmap(
        cm_data,
        annot=True,
        fmt="d",
        xticklabels=labels,
        yticklabels=labels,
        cmap="Greens",
        ax=ax,
    )
    ax.set_title(
        "Grade Prediction Confusion Matrix", fontsize=14,
        fontweight="bold", color="#1A5C38"
    )
    ax.set_xlabel("Predicted Grade")
    ax.set_ylabel("Actual Grade")

    result = _save_or_b64(fig, save_path)
    plt.close(fig)
    return result
