<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppIcon from "./components/AppIcon.vue";
import LotteryBalls from "./components/LotteryBalls.vue";
import RuleOverview from "./components/RuleOverview.vue";
import HistoryMatrix from "./components/HistoryMatrix.vue";
import RuleLibrary from "./components/RuleLibrary.vue";
import MethodGuide from "./components/MethodGuide.vue";
import { useAnalysis } from "./composables/useAnalysis";
import { percent } from "./utils/format";
import type { Page } from "./types/lottery";

const {
  area,
  limit,
  data,
  loading,
  error,
  load,
} = useAnalysis();
const page = ref<Page>("overview");
const selectedKey = ref("");
const navigation = [
  {
    key: "overview",
    title: "近期总览",
    icon: "grid",
    subtitle: "比较分组规律",
  },
  {
    key: "history",
    title: "逐期分布",
    icon: "history",
    subtitle: "每期开奖的全部分布",
  },
  {
    key: "library",
    title: "规律图鉴",
    icon: "book",
    subtitle: "分组定义与条件分析",
  },
  {
    key: "method",
    title: "分析方法",
    icon: "info",
    subtitle: "理解数据与比较方式",
  },
] as const;
const currentPage = computed(() =>
  navigation.find((item) => item.key === page.value)!,
);
const firstRule = computed(() => data.value?.rules[0]);
const enoughRules = computed(
  () =>
    data.value?.rules.filter((rule) => rule.status !== "insufficient").length ||
    0,
);
const sourceLabel = computed(() =>
  data.value ? "官方历史数据" : "等待数据",
);
const updatedTime = computed(() =>
  data.value
    ? new Date(data.value.meta.updatedAt).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Shanghai",
      })
    : "",
);
watch(data, (value) => {
  if (value && !value.rules.some((rule) => rule.key === selectedKey.value))
    selectedKey.value = value.rules[0]?.key || "";
});
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#" @click.prevent="page = 'overview'"
        ><span class="brand-mark"><i></i><i></i><i></i><i></i></span
        ><span
          ><strong>大乐透<span class="brand-dot">.</span></strong
          ><small>分组研究台</small></span
        ></a
      >
      <div class="sidebar-label">研究工作台</div>
      <nav aria-label="主导航">
        <button
          v-for="item in navigation"
          :key="item.key"
          :class="['nav-item', { active: page === item.key }]"
          @click="page = item.key"
        >
          <AppIcon :name="item.icon" :size="19" /><span>{{ item.title }}</span
          ><i v-if="page === item.key"></i>
        </button>
      </nav>
      <div class="sidebar-note">
        <span class="note-symbol"><AppIcon name="chart" :size="22" /></span
        ><strong>让规律经得起比较</strong>
        <p>观察号码结构，<br />用数据检验排除条件。</p>
        <button @click="page = 'method'">
          了解分析方法 <AppIcon name="arrow" :size="14" />
        </button>
      </div>
      <div class="sidebar-bottom">
        <span class="live-dot"></span>大乐透分组分析
        <small>01 / RESEARCH</small>
      </div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb">
          数据研究 <AppIcon name="chevron" :size="13" /><strong>{{
            currentPage.title
          }}</strong>
        </div>
        <div class="topbar-actions">
          <span
            class="source-chip"
            :class="{
              inactive: !data,
              imported: data?.meta.source === 'import',
            }"
            ><i></i>{{ sourceLabel }}</span
          ><button
            class="refresh-button"
            :disabled="loading"
            @click="load(true)"
          >
            <AppIcon
              name="refresh"
              :size="16"
              :class="{ spinning: loading }"
            /><span>{{ loading ? "读取中" : "更新数据" }}</span>
          </button>
        </div>
      </header>

      <main class="main-content">
        <div class="page-intro">
          <div>
            <div class="intro-kicker">
              <span></span>SUPER LOTTO / GROUP RESEARCH
            </div>
            <h1>
              {{
                page === "overview"
                  ? "近期哪些规律更值得观察？"
                  : currentPage.title === "逐期分布"
                    ? "每一期，都有完整的分布答案。"
                    : page === "library"
                      ? "把分组规律，一条条看清楚。"
                      : "先理解指标，再做判断。"
              }}
            </h1>
            <p>
              {{
                page === "overview"
                  ? "比较常用分组的历史保留表现，找到压缩组合与保留开奖之间的平衡。"
                  : currentPage.subtitle
              }}
            </p>
          </div>
          <div class="page-index">
            {{
              String(
                navigation.findIndex((item) => item.key === page) + 1,
              ).padStart(2, "0")
            }}<span>/ 04</span>
          </div>
        </div>

        <div v-if="error" class="notice-banner error" role="alert">
          <AppIcon name="info" :size="18" /><span>{{ error }}</span
          ><button @click="load()">重试</button>
        </div>
        <div
          v-if="data?.meta.warning"
          class="notice-banner warning"
          role="status"
        >
          <AppIcon name="clock" :size="18" /><span
            >{{ data.meta.warning }} 截止 {{ data.meta.latestDrawDate }}，第{{
              data.meta.latestDrawNum
            }}期。</span
          >
        </div>

        <div v-if="page !== 'method'" class="filter-bar">
          <div class="filter-section">
            <span class="filter-label">分析区域</span>
            <div class="segmented-control" aria-label="分析区域">
              <button
                :class="{ active: area === 'front' }"
                @click="area = 'front'"
              >
                前区 <small>35选5</small></button
              ><button
                :class="{ active: area === 'back' }"
                @click="area = 'back'"
              >
                后区 <small>12选2</small>
              </button>
            </div>
          </div>
          <span class="filter-divider"></span>
          <div class="filter-section period-filter">
            <label class="filter-label" for="period-window">观察窗口</label
            ><select id="period-window" v-model.number="limit">
              <option v-for="n in [20, 30, 50, 100, 200]" :key="n" :value="n">
                近 {{ n }} 期
              </option>
            </select>
          </div>
          <span class="filter-description"
            ><AppIcon name="clock" :size="15" />{{
              data
                ? `数据截止 ${data.latestDraw.drawDate}`
                : "按最新有效开奖统计"
            }}</span
          >
        </div>

        <MethodGuide v-if="page === 'method'" />
        <template v-else-if="data">
          <div v-if="data.sampleCount < limit" class="notice-banner warning">
            <AppIcon name="info" :size="17" /><span
              >当前只有
              {{
                data.sampleCount
              }}
              期有效记录，所有指标按实际样本计算；更多历史更新后可重新比较。</span
            >
          </div>
          <section
            v-if="page === 'overview'"
            class="stats-grid"
            aria-label="分析摘要"
          >
            <article class="stat-card">
              <div class="stat-label">
                当前分析窗口 <AppIcon name="history" :size="17" />
              </div>
              <div class="stat-value">
                {{ data.sampleCount }}<span>期</span>
              </div>
              <div class="stat-description">
                {{ data.trainingCount }}期训练 <i></i>
                {{ data.validationCount }}期验证
              </div>
            </article>
            <article class="stat-card">
              <div class="stat-label">
                可比较分组规律 <AppIcon name="layers" :size="17" />
              </div>
              <div class="stat-value">{{ data.ruleCount }}<span>种</span></div>
              <div class="stat-description">
                {{ enoughRules }}种达到基本样本要求
              </div>
            </article>
            <article class="stat-card accent">
              <div class="stat-label">
                首位观察规律 <AppIcon name="chart" :size="17" />
              </div>
              <div class="stat-value rule-stat">
                {{ firstRule?.title || "—" }}
              </div>
              <div class="stat-description">验证差值与不确定性共同排序</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">
                首位规律组合压缩 <AppIcon name="filter" :size="17" />
              </div>
              <div class="stat-value">
                {{ percent(firstRule?.compression) }}
              </div>
              <div class="stat-description">按最新开奖后的分组精确计数</div>
            </article>
          </section>

          <section v-if="page === 'overview'" class="latest-strip">
            <div class="latest-caption">
              <span class="latest-indicator"></span><strong>最新开奖</strong
              ><span>第 {{ data.latestDraw.drawNum }} 期</span
              ><small>{{ data.latestDraw.drawDate }}</small>
            </div>
            <LotteryBalls
              :reds="data.latestDraw.reds"
              :blues="data.latestDraw.blues"
            /><button class="text-button" @click="page = 'history'">
              查看全部分布 <AppIcon name="arrow" :size="16" />
            </button>
          </section>

          <RuleOverview
            v-if="page === 'overview'"
            :data="data"
            :selected-key="selectedKey"
            @select="selectedKey = $event"
            @history="page = 'history'"
          />
          <HistoryMatrix
            v-else-if="page === 'history'"
            :data="data"
            :selected-key="selectedKey"
          />
          <RuleLibrary
            v-else-if="page === 'library'"
            :data="data"
            :selected-key="selectedKey"
            @select="selectedKey = $event"
          />
          <div class="page-footnote">
            <span
              ><AppIcon
                name="info"
                :size="14"
              />保留率表示历史开奖未被排除的比例，未来表现需要新开奖继续验证。</span
            ><span>{{ sourceLabel }} · {{ updatedTime }} 核验</span>
          </div>
        </template>
        <div v-else-if="loading" class="loading-state" role="status">
          <div class="loading-symbol">
            <AppIcon name="refresh" :size="28" class="spinning" />
          </div>
          <h2>正在计算近期分组数据</h2>
          <p>读取真实开奖，计算每期分布与理论组合基线。</p>
          <div class="skeleton-grid"><i></i><i></i><i></i><i></i></div>
        </div>
        <section v-else class="panel empty-state">
          <div class="empty-symbol"><AppIcon name="layers" :size="34" /></div>
          <span class="eyebrow">START WITH VERIFIED DATA</span>
          <h2>从一份真实开奖数据开始</h2>
          <p>
            读取本站已核验的官方历史开奖。<br />数据就绪后，这里将展示全部分组规律的逐期分析。
          </p>
          <div class="empty-actions">
            <button class="primary-button" @click="load(true)">
              <AppIcon name="refresh" :size="17" />重新读取数据
            </button>
          </div>
          <button class="text-button" @click="page = 'method'">
            查看数据来源与分析方法 <AppIcon name="arrow" :size="15" />
          </button>
        </section>
      </main>
    </div>
  </div>
</template>
