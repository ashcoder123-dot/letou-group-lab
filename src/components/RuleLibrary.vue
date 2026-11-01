<script setup lang="ts">
import { computed, ref } from "vue";
import type { AnalysisResult } from "../types/lottery";
import { integer, number, percent, points } from "../utils/format";
import AppIcon from "./AppIcon.vue";

const props = defineProps<{ data: AnalysisResult; selectedKey: string }>();
const emit = defineEmits<{ select: [key: string] }>();
const category = ref("all");
const rules = computed(() =>
  props.data.rules.filter(
    (rule) => category.value === "all" || rule.category === category.value,
  ),
);
const selected = computed(
  () =>
    props.data.rules.find((rule) => rule.key === props.selectedKey) ||
    props.data.rules[0]!,
);
</script>

<template>
  <div class="library-layout">
    <section class="panel library-list">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">RULE INDEX</span>
          <h2>实用分组图鉴</h2>
        </div>
      </div>
      <div class="library-filter">
        <select v-model="category" aria-label="规律类型">
          <option value="all">全部类型</option>
          <option value="static">固定分组</option>
          <option value="recent">动态分组</option>
        </select>
      </div>
      <button
        v-for="rule in rules"
        :key="rule.key"
        :class="['library-rule', { active: selected.key === rule.key }]"
        @click="emit('select', rule.key)"
      >
        <span
          ><strong>{{ rule.title }}</strong
          ><small>{{
            rule.category === "recent"
              ? `依赖此前${rule.lookback}期`
              : `${rule.nextGroups?.length || "—"}个固定分组`
          }}</small></span
        ><AppIcon name="chevron" :size="16" />
      </button>
    </section>
    <section class="panel library-detail">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">GROUP DEFINITIONS</span>
          <h2>
            {{ selected.title }}
            <span class="small-tag">{{
              selected.category === "recent" ? "动态分组" : "固定分组"
            }}</span>
          </h2>
          <p>{{ selected.description }}</p>
        </div>
      </div>
      <div class="library-content">
        <div class="inline-info">
          <AppIcon name="info" :size="17" /><span>{{
            selected.category === "recent"
              ? "以下为最新开奖后的分组。历史逐期分析会使用各期开奖前的分组，不会把这份分组套用到过去。"
              : "以下分组覆盖本区全部号码，且每个号码只属于一个组。"
          }}</span>
        </div>
        <div class="definition-groups">
          <article v-for="group in selected.nextGroups" :key="group.label">
            <div>
              <h3>{{ group.label }}</h3>
              <span>{{ group.numbers.length }}个号码</span>
            </div>
            <div class="definition-numbers">
              <span v-for="n in group.numbers" :key="n">{{ number(n) }}</span
              ><small v-if="!group.numbers.length">当前为空组</small>
            </div>
          </article>
          <p v-if="!selected.nextGroups" class="muted-copy">
            至少需要此前 {{ selected.lookback }} 期记录才能建立本规则的分组。
          </p>
        </div>
        <div class="section-caption">
          <h3>不同排除力度的表现</h3>
          <span>当前窗口 · {{ data.sampleCount }}期</span>
        </div>
        <p class="muted-copy">
          下表列出全部单组上限。绿色行是仅由较早训练段选择的条件；验证段未参与选择。
        </p>
        <div class="table-scroll">
          <table class="candidate-table">
            <thead>
              <tr>
                <th>保留条件</th>
                <th>训练段保留</th>
                <th>验证段保留</th>
                <th>验证理论基线</th>
                <th>验证差值</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="candidate in selected.candidates"
                :key="candidate.threshold"
                :class="{ chosen: candidate.threshold === selected.threshold }"
              >
                <td>
                  单组最多{{ candidate.threshold }}个
                  <span
                    v-if="candidate.threshold === selected.threshold"
                    class="chosen-label"
                    >{{
                      selected.conditionSource === "training"
                        ? "训练选定"
                        : "预设"
                    }}</span
                  >
                </td>
                <td>{{ percent(candidate.training.retention) }}</td>
                <td>{{ percent(candidate.validation.retention) }}</td>
                <td>{{ percent(candidate.validation.baseline) }}</td>
                <td>{{ points(candidate.validation.lift) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="definition-summary">
          <div>
            <span>当前条件</span><b>{{ selected.condition }}</b>
          </div>
          <div>
            <span>最新分组理论保留</span
            ><b>{{ percent(selected.nextBaseline) }}</b>
          </div>
          <div>
            <span>剩余组合数</span
            ><b>{{ integer(selected.retainedCombinations) }}</b>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
