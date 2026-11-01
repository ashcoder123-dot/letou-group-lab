<script setup lang="ts">
import { computed } from "vue";
import type { AnalysisResult } from "../types/lottery";
import { integer, percent, points, statusLabel } from "../utils/format";
import AppIcon from "./AppIcon.vue";

const props = defineProps<{ data: AnalysisResult; selectedKey: string }>();
const emit = defineEmits<{ select: [key: string]; history: [] }>();
const selected = computed(
  () =>
    props.data.rules.find((rule) => rule.key === props.selectedKey) ||
    props.data.rules[0]!,
);
const recent = computed(() =>
  props.data.draws
    .slice(0, 20)
    .reverse()
    .map((draw) => {
      const item = draw.distributions[selected.value.key];
      return {
        issue: draw.drawNum,
        passed:
          item == null ? null : item.maxCluster <= selected.value.threshold,
      };
    }),
);
</script>

<template>
  <div class="overview-layout">
    <section class="panel comparison-panel">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">RULE COMPARISON</span>
          <h2>
            分组规律对比 <span class="count-tag">{{ data.ruleCount }}</span>
          </h2>
          <p>
            较早 {{ data.trainingCount }} 期选条件，较近
            {{ data.validationCount }} 期验证
          </p>
        </div>
        <span class="subtle-icon"><AppIcon name="layers" /></span>
      </div>
      <div class="table-scroll">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>分组规律 / 排除条件</th>
              <th title="较近30%开奖中，未被条件排除的比例">验证保留率</th>
              <th title="同一验证区间，均匀随机组合满足条件的理论比例">
                理论基线
              </th>
              <th title="基于最新开奖后分组，条件排除的理论组合比例">
                组合压缩率
              </th>
              <th title="验证保留率减去验证段理论基线，单位为百分点">
                与基线之差
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(rule, index) in data.rules"
              :key="rule.key"
              :class="{ selected: selected.key === rule.key }"
              @click="emit('select', rule.key)"
            >
              <td>
                <button
                  class="rule-row-button"
                  @click.stop="emit('select', rule.key)"
                >
                  <span class="rank-number">{{
                    String(index + 1).padStart(2, "0")
                  }}</span
                  ><span
                    ><strong
                      >{{ rule.title }}
                      <i
                        v-if="rule.category === 'recent'"
                        class="dynamic-dot"
                        title="动态分组"
                      ></i></strong
                    ><small
                      >{{ rule.condition
                      }}<span v-if="rule.status === 'insufficient'">
                        · 样本不足</span
                      ></small
                    ></span
                  >
                </button>
              </td>
              <td>
                <strong class="metric-main">{{
                  percent(rule.validation.retention)
                }}</strong
                ><small
                  >{{ rule.validation.retainedCount }} /
                  {{ rule.validation.sampleCount }} 期</small
                >
              </td>
              <td class="muted-cell">
                {{ percent(rule.validation.baseline) }}
              </td>
              <td>
                <span class="compression-label">{{
                  percent(rule.compression)
                }}</span>
                <div class="mini-track">
                  <i
                    :style="{ width: `${(rule.compression || 0) * 100}%` }"
                  ></i>
                </div>
              </td>
              <td>
                <span
                  :class="[
                    'lift-value',
                    {
                      positive: (rule.validation.lift || 0) > 0,
                      negative: (rule.validation.lift || 0) < 0,
                    },
                  ]"
                  >{{ points(rule.validation.lift) }}</span
                >
              </td>
              <td><AppIcon name="chevron" :size="15" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="panel-footnote">
        <AppIcon name="info" :size="15" /><span
          >按验证区间下界相对基线排序；压缩率越高，排除的组合越多，也可能误排更多历史开奖。</span
        >
      </div>
    </section>

    <aside class="panel focus-panel" aria-label="当前规律详情">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">RULE FOCUS</span>
          <h2>当前关注规律</h2>
        </div>
        <span class="small-tag">{{
          selected.category === "recent" ? "动态分组" : "固定分组"
        }}</span>
      </div>
      <div class="focus-body">
        <div class="focus-title">
          <span class="rule-symbol"><AppIcon name="filter" :size="25" /></span>
          <div>
            <h3>{{ selected.title }}</h3>
            <span :class="['status-text', selected.status]">{{
              statusLabel(selected.status)
            }}</span>
          </div>
        </div>
        <p class="rule-description">{{ selected.description }}</p>
        <div class="condition-box">
          <span>当前研究条件</span><strong>{{ selected.condition }}</strong>
          <p>排除单组出现 {{ selected.threshold + 1 }} 个及以上号码的组合</p>
        </div>
        <div class="focus-metrics">
          <div>
            <span>验证保留率</span
            ><strong>{{ percent(selected.validation.retention) }}</strong>
          </div>
          <div>
            <span>组合压缩率</span
            ><strong>{{ percent(selected.compression) }}</strong>
          </div>
        </div>
        <div class="confidence-line">
          保留率95%区间
          <b
            >{{ percent(selected.validation.confidenceLow) }} –
            {{ percent(selected.validation.confidenceHigh) }}</b
          >
        </div>
        <div class="section-caption">
          <strong>最近20期回看</strong><span>旧 → 新</span>
        </div>
        <div class="retention-dots">
          <span
            v-for="(item, i) in recent"
            :key="i"
            :class="{ pass: item.passed === true, fail: item.passed === false }"
            :title="`${item.issue}期：${item.passed == null ? '前置历史不足' : item.passed ? '保留' : '排除'}`"
          ></span>
        </div>
        <div class="dot-legend">
          <span><i class="pass"></i>历史保留</span
          ><span><i class="fail"></i>历史排除</span>
        </div>
        <div class="section-caption pattern-caption">
          <strong>常见分布形态</strong><span>整个分析窗口</span>
        </div>
        <div
          v-for="pattern in selected.patterns.slice(0, 3)"
          :key="pattern.pattern"
          class="pattern-row"
        >
          <div>
            <span>{{ pattern.pattern }}</span
            ><small
              >{{ pattern.count }}期 · {{ percent(pattern.percentage) }}</small
            >
          </div>
          <div class="pattern-track">
            <i :style="{ width: `${pattern.percentage * 100}%` }"></i>
          </div>
        </div>
        <p v-if="!selected.patterns.length" class="muted-copy">
          前置开奖不足，暂无可比较分布。
        </p>
        <button class="outline-button full-width" @click="emit('history')">
          查看逐期分布 <AppIcon name="arrow" :size="16" />
        </button>
        <p class="detail-note">
          最新分组保留 {{ integer(selected.retainedCombinations) }} /
          {{ integer(selected.totalCombinations) }} 种{{
            data.area === "front" ? "前" : "后"
          }}区组合。
        </p>
      </div>
    </aside>
  </div>
</template>
