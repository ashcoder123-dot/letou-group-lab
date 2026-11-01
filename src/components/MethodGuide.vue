<script setup lang="ts">

</script>
<template>
  <section class="panel method-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">HOW TO READ THE DATA</span>
        <h2>让每一个比较都有依据</h2>
        <p>先理解规则排除了什么，再判断近期表现是否值得继续观察。</p>
      </div>
    </div>
    <div class="method-content">
      <article>
        <span class="step-label">01</span>
        <div>
          <h3>历史保留率与组合压缩率，要放在一起看</h3>
          <p>
            保留率 = 满足条件的历史开奖期数 ÷
            可分析期数。例如“单组最多2个”，当期任一组出现3个号码就会被排除。组合压缩率
            = 1 − 满足条件的理论组合数 ÷
            全部合法组合数。高保留率配合极低压缩率，往往只是条件很宽松。
          </p>
        </div>
      </article>
      <article>
        <span class="step-label">02</span>
        <div>
          <h3>先选择条件，再检验近期开奖</h3>
          <p>
            窗口内较早70%的记录用于选择单组上限，较近30%用于验证。条件按训练保留率的Wilson区间下界与理论基线之差选定，理论保留比例限于10%–95%，排除不可能条件与几乎不筛选的条件。规律榜按验证区间下界相对基线排序。
          </p>
          <p>
            训练和验证各至少10个有效样本才给出比较状态。动态规律需要更多前置历史，因此实际有效样本可能少于窗口期数。切换窗口会重新训练条件。
          </p>
        </div>
      </article>
      <article>
        <span class="step-label">03</span>
        <div>
          <h3>分组容量不同，理论基线也不同</h3>
          <p>
            五区、尾数和质合的组数、容量不同，不能直接比较“分得均不均匀”。系统按各组容量精确计算符合条件的组合数。动态分组的容量逐期变化，其验证基线是各期理论保留率的平均值；组合压缩率则按最新开奖后的分组计算。
          </p>
        </div>
      </article>
      <article>
        <span class="step-label">04</span>
        <div>
          <h3>动态分组只看当期开奖之前</h3>
          <p>
            重号与邻号以前一期为参照。冷热和遗漏使用此前20期，始终排除正在分析的当期号码。缺少前置记录时显示“前置历史不足”，不使用未来开奖填补。短遗漏不等同于高频，两个规律分别统计。
          </p>
        </div>
      </article>
      <article>
        <span class="step-label">05</span>
        <div>
          <h3>比较结果需要后续新开奖继续验证</h3>
          <p>
            保留率描述历史开奖号码是否被排除，不等于未来中奖率。榜单同时比较多条规律，近期较高的差值也可能来自样本波动。95%区间描述观察保留比例的不确定性，不代表未来表现保证。
          </p>
        </div>
      </article>
      <article><span class="step-label">06</span><div><h3>数据来源与更新</h3><p>本站使用已核验的体彩官方历史开奖。页面显示当前数据的截止期号、开奖日期和核验时间；新开奖由维护者核验并发布后展示。点击“更新数据”会重新读取本站已发布的数据。</p><p>所有分组统计基于实际有效记录，缺失开奖不会补造。公开页面提供只读分析，访客不会覆盖其他人的开奖数据。</p></div></article>
    </div>
  </section>
</template>
