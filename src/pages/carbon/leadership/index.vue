<script setup lang="ts">
/**
 * 对应线上「领导驾驶舱 → 碳资产数据大屏」（https://carbon-screen.rcisyn.com/#/assets）
 *
 * **按约定「站内特殊页 → 直接复刻原版 HTML」**：DOM 层级、class 名、绝对定位坐标、
 * 1920×1080 画布与自适应缩放都照线上原样抄（`.screen-wrapper` / `.layout-title` /
 * `.assets-container` / `.box-1`…`box-3` 是线上的原名）。图片资源也一并落到
 * `./img/`（线上 /screen/static/img 下 5 张，热链不稳定且离开对方站点就没了）。
 *
 * 已接入（两个查询，均不带分页）：
 *   GET /business/assetsOverview/getAssertVO            → 各板块汇总值
 *   GET /business/assetsOverview/getReductionAssertVO  → 减碳贡献图数据
 *   线上前缀是 `/prod-api/api`，本仓库统一走 `/api`（withApiPrefix），业务段一致。
 *
 * ── 与线上的差异（有意，验收按这里对照）──
 * 1. **减碳贡献图**：线上是 ECharts canvas（`_echarts_instance_`）。本次用手写 SVG 画同款
 *    锥形柱状图——数据 `getReductionAssertVO` 五项与线上完全一致。没直接换 echarts 的原因是
 *    原图用的是自定义 series（锥形柱），引库之后仍要自己写 renderItem 才能等价还原，
 *    换库不等于换到图；依赖里现在有 echarts（后加），要更贴近原版再改，
 *    届时按 AGENTS §4 用动态 import，别让它进主 chunk。
 * 2. **全局设置弹窗**（`.setting-container`，线上 `display:none`）是 LSD 大屏设计器的分辨率设置，
 *    属设计器外壳而非页面内容，未复刻；`btn-setting` 按钮保留为插桩。
 * 3. **天气**（天津市 周六 雾 / 24℃）线上取自高德，本次未接：日期用当天实时值，
 *    天气两行显示抓取时的值。接高德后替换即可。
 * 4. 大屏自己的查询按钮：这一页没有（线上也没有），所以没有导出/增删改。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { carbonGet } from "@/api/carbon/queries";
import { useToast } from "@/composables/useToast";

import bgCenterTitle from "./img/bg_center_title.png";
import bgBorderLeft from "./img/bg_border_left.png";
import bgBorderRight from "./img/bg_border_right.png";
import bgBorderBottom from "./img/bg_border_bottom.png";
import iconTianqi from "./img/icon_tianqi_yun.png";

interface AssertVO {
  emissionReductionTotal?: string;
  emissionTotal?: string;
  emissionIntensityTotal?: string;
  heatingAreaCount?: string;
  heatingReduceTotal?: string;
  steelMechanicalReduceTotal?: string;
  steelElectricReduceTotal?: string;
  makHydCount?: string;
  hydStationCount?: string;
  hydVehicleCount?: string;
  hydTravlledDistanceCount?: string;
  hydReductionTotal?: string;
  hydTransportCount?: string;
  greenElectricBuyCount?: string;
  greenElectricReduceTotal?: string;
  electricGenerateReduceTotal?: string;
  electricSinteringReduceTotal?: string;
  electricSolarPowerReduceTotal?: string;
}
interface Contribution {
  contributionProductName: string;
  contributionTotal: string;
}

const { toast } = useToast();
const vo = reactive<AssertVO>({});
const contributions = ref<Contribution[]>([]);

/* carbonGet 与 carbonQuery 同款：`carbonGet(path)` 返回的是**请求函数**，必须再调一次才发请求。
   早先写成 `await carbonGet(path)` —— await 到的是函数本身（非 Promise 原样返回），
   Object.assign 拿到的是函数对象、无可枚举属性，于是 vo 恒空，页面只剩布局与图片。 */
const fetchOverview = carbonGet<AssertVO>("/assetsOverview/getAssertVO");
const fetchContributions = carbonGet<Contribution[]>("/assetsOverview/getReductionAssertVO");

async function load() {
  try {
    Object.assign(vo, (await fetchOverview()) ?? {});
    contributions.value = (await fetchContributions()) ?? [];
  } catch {
    /* 拦截层已 toast */
  }
}
onMounted(load);

/* ── 1920×1080 画布的自适应缩放（线上由 LSD 运行时算 transform，这里自己算）── */
const scale = ref(1);
const W = 1920;
const H = 1080;
function fit() {
  const k = Math.min(window.innerWidth / W, window.innerHeight / H);
  scale.value = Number.isFinite(k) && k > 0 ? k : 1;
}
onMounted(() => {
  fit();
  window.addEventListener("resize", fit);
});
onBeforeUnmount(() => window.removeEventListener("resize", fit));

/* 居中交给外层 flex，这里只缩放。
   早先 `margin: (vh-1080k)/2 auto` 配样式里继承来的 `transform-origin: left top`：
   margin 按缩放后高度算、origin 却在左上角，横向 margin:auto 对超宽块又恒为 0，
   结果画布不居中、边缘露出根节点底色 —— 就是顶部那条黑线。
   改为 origin:center + flex 居中：盒子先居中、再绕自身中心缩放，四周不留缝。 */
const wrapperStyle = computed(() => ({
  width: `${W}px`,
  height: `${H}px`,
  transform: `scale(${scale.value})`,
}));

const pad2 = (n: number) => String(n).padStart(2, "0");
const today = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
});

/* ── 减碳贡献：同款锥形柱状图的 SVG 版（替代线上 ECharts canvas，见文件头差异 1）──
   锥形 = 上窄下宽的梯形；高度按占最大值比例，留出顶部数值与底部名称的空间。 */
const CW = 280;
const CH = 330;
const PAD_TOP = 46;
const PAD_BOTTOM = 44;

function chartBars() {
  const list = contributions.value;
  if (!list.length) return [];
  const max = Math.max(...list.map((c) => Number(c.contributionTotal) || 0), 1);
  const slot = CW / list.length;
  const bw = Math.min(slot * 0.52, 46);
  return list.map((c, i) => {
    const v = Number(c.contributionTotal) || 0;
    const h = ((CH - PAD_TOP - PAD_BOTTOM) * v) / max;
    const cx = slot * i + slot / 2;
    const bottom = CH - PAD_BOTTOM;
    const top = bottom - h;
    const halfBottom = bw / 2;
    const halfTop = bw * 0.24; // 上窄下宽 → 锥形
    return {
      key: `${c.contributionProductName}-${i}`,
      name: c.contributionProductName,
      value: c.contributionTotal,
      points: `${cx - halfBottom},${bottom} ${cx + halfBottom},${bottom} ${cx + halfTop},${top} ${cx - halfTop},${top}`,
      cx,
      top,
      bottom,
    };
  });
}

function onSetting() {
  toast("大屏全局设置待接入", 2000, "warn");
}
</script>

<template>
  <div class="leadership-root">
    <div class="screen-wrapper scale-wrap" :style="wrapperStyle">
      <div class="layout-container">
        <div class="layout-body">
          <!-- 顶部标题栏（三个大屏入口） -->
          <div class="layout-title" :style="{ backgroundImage: `url(${bgCenterTitle})` }">
            <div class="btn-setting" @click="onSetting" />
            <div class="title-text-1">碳排放</div>
            <div class="title-text-2">碳资产数据大屏</div>
            <div class="title-text-3">碳交易</div>
          </div>

          <div class="assets-container">
            <img :src="bgBorderLeft" width="23" height="890" class="border-left" alt="" />
            <img :src="bgBorderRight" width="23" height="890" class="border-right" alt="" />
            <img :src="bgBorderBottom" width="1799" height="104" class="border-bottom" alt="" />

            <!-- 资产总览 + 减碳贡献 -->
            <div class="box-1">
              <div class="box-1-1">
                <div class="box-1-1-1 title-280x36">
                  <div>资产总览</div>
                  <div>assets</div>
                </div>
                <div class="box-1-1-2">
                  <div>累计减碳量（吨）</div>
                  <div>{{ vo.emissionReductionTotal ?? "-" }}</div>
                </div>
                <div class="box-1-1-2">
                  <div>累计排放量（吨）</div>
                  <div>{{ vo.emissionTotal ?? "-" }}</div>
                </div>
                <div class="box-1-1-2">
                  <div>碳排放强度（吨碳/吨钢）</div>
                  <div>{{ vo.emissionIntensityTotal ?? "-" }}</div>
                </div>
              </div>

              <div class="box-1-2">
                <div class="title-280x36">
                  <div>减碳贡献</div>
                  <div>contribute</div>
                </div>
                <div class="jiantangongxian">
                  <div class="chart">
                    <svg class="contrib-chart" :viewBox="`0 0 ${CW} ${CH}`" preserveAspectRatio="xMidYMid meet">
                      <g v-for="b in chartBars()" :key="b.key">
                        <polygon :points="b.points" class="bar-shape" />
                        <text :x="b.cx" :y="b.top - 8" class="bar-value" text-anchor="middle">
                          {{ b.value }}
                        </text>
                        <text :x="b.cx" :y="b.bottom + 24" class="bar-name" text-anchor="middle">
                          {{ b.name }}
                        </text>
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- 五块指标卡（绝对定位坐标照抄线上） -->
            <div class="box-2">
              <div class="box-2-1 box-440x100 yuregongnuan" style="top: 80px; right: unset; bottom: unset; left: 120px">
                <div class="box-2-1-1">余热供暖</div>
                <div class="box-2-1-2">
                  <div>供暖面积</div>
                  <div>{{ vo.heatingAreaCount ?? "-" }}</div>
                  <div>万平方米/年</div>
                </div>
                <div class="box-2-1-2">
                  <div>减碳量</div>
                  <div>{{ vo.heatingReduceTotal ?? "-" }}</div>
                  <div>吨</div>
                </div>
              </div>

              <div
                class="box-2-1 box-520x100 gangtieshengchan"
                style="top: 80px; right: 360px; bottom: unset; left: unset"
              >
                <div class="box-2-1-1">钢铁生产</div>
                <div class="box-2-1-2">
                  <div>机电设备升级减碳量</div>
                  <div>{{ vo.steelMechanicalReduceTotal ?? "-" }}</div>
                  <div>吨</div>
                </div>
                <div class="box-2-1-2">
                  <div>长改短电炉减碳量</div>
                  <div>{{ vo.steelElectricReduceTotal ?? "-" }}</div>
                  <div>吨</div>
                </div>
              </div>

              <div
                class="box-2-1 box-360x145 qingnengchanye"
                style="top: 710px; right: unset; bottom: unset; left: 110px"
              >
                <div class="box-2-1-1">氢能产业</div>
                <div class="box-2-1-2">
                  <div>制氢站</div>
                  <div>{{ vo.makHydCount ?? "-" }}</div>
                  <div>座</div>
                </div>
                <div class="box-2-1-2">
                  <div>加氢站</div>
                  <div>{{ vo.hydStationCount ?? "-" }}</div>
                  <div>座</div>
                </div>
                <div class="box-2-1-2">
                  <div>氢能车</div>
                  <div>{{ vo.hydVehicleCount ?? "-" }}</div>
                  <div>辆</div>
                </div>
                <div class="box-2-1-2">
                  <div>行驶里程</div>
                  <div>{{ vo.hydTravlledDistanceCount ?? "-" }}</div>
                  <div>万公里</div>
                </div>
                <div class="box-2-1-2">
                  <div>减碳量</div>
                  <div>{{ vo.hydReductionTotal ?? "-" }}</div>
                  <div>吨</div>
                </div>
                <div class="box-2-1-2">
                  <div>运输量</div>
                  <div>{{ vo.hydTransportCount ?? "-" }}</div>
                  <div>万吨</div>
                </div>
              </div>

              <div
                class="box-2-1 box-360x100 goumailvdian"
                style="top: 710px; right: 600px; bottom: unset; left: unset"
              >
                <div class="box-2-1-1">购买绿电</div>
                <div class="box-2-1-2">
                  <div>电量</div>
                  <div>{{ vo.greenElectricBuyCount ?? "-" }}</div>
                  <div>kWh</div>
                </div>
                <div class="box-2-1-2">
                  <div>减碳量</div>
                  <div>{{ vo.greenElectricReduceTotal ?? "-" }}</div>
                  <div>吨</div>
                </div>
              </div>

              <div class="box-2-1 box-380x126 fadian" style="top: 710px; right: 170px; bottom: unset; left: unset">
                <div class="box-2-1-1">发电</div>
                <div class="box-2-1-2">
                  <div>余热发电减碳</div>
                  <div>{{ vo.electricGenerateReduceTotal ?? "-" }}</div>
                  <div>吨</div>
                </div>
                <div class="box-2-1-2">
                  <div>烧结发电减碳</div>
                  <div>{{ vo.electricSinteringReduceTotal ?? "-" }}</div>
                  <div>吨</div>
                </div>
                <div class="box-2-1-2">
                  <div>光伏发电减碳</div>
                  <div>{{ vo.electricSolarPowerReduceTotal ?? "-" }}</div>
                  <div>吨</div>
                </div>
              </div>
            </div>

            <!-- 日期 + 天气 -->
            <div class="box-3">
              <img :src="iconTianqi" width="134" height="140" alt="" />
              <div class="bg-tianqi" />
              <div>{{ today }}</div>
              <div style="margin-top: 8px">天津市 周六 雾</div>
              <div style="margin-top: 8px">24℃</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 数据字体 = DIN Condensed（线上 @font-face 原样抄，源文件 /screen/static/fonts/DINCond-Black.*.otf）。
   它就是「比较窄的字体」：资产总览三个大数、五块指标卡的数值、右下温度都靠它。
   字体文件落在 ./img/ 与图片一起打包，30KB，随本页 chunk 按需加载。
   注：线上标题还用了 jianti（jianti.ttf 1.7MB，只服务 4 处小标题），本次**未引入**——
   成本与收益不成比例，标题回落到系统中文字体；要完全一致把该文件放进来再补一条 @font-face 即可。 */
@font-face {
  font-family: DIN;
  src: url("./img/DINCond-Black.otf") format("opentype");
  font-display: swap;
}
.title-280x36 {
  width: 280px;
  height: 36px;
  background-image: url("./img/bg_title_280x36.png");
  background-size: 100% 100%;
  display: flex;
}
.title-280x36 div:first-child {
  height: 22px;
  font-size: 22px;
  font-weight: 400;
  color: rgb(27, 75, 64);
  line-height: 22px;
  margin-top: 2px;
  margin-left: 22px;
  font-family: jianti, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.title-280x36 div:last-child {
  height: 14px;
  font-size: 14px;
  font-weight: 400;
  color: rgba(153, 153, 153, 0.5);
  line-height: 14px;
  margin-top: 5px;
  margin-right: 52px;
  margin-left: auto;
  text-transform: uppercase;
}
.box-360x145 {
  width: 360px;
  height: 145px;
  background-image: url("./img/bg_box_325x145.png");
  background-size: 100% 100%;
}
.box-440x100 {
  width: 440px;
  height: 100px;
  background-image: url("./img/bg_box_440x100.png");
  background-size: 100% 100%;
}
.box-520x100 {
  width: 520px;
  height: 100px;
  background-image: url("./img/bg_box_520x100.png");
  background-size: 100% 100%;
}
.box-360x100 {
  width: 360px;
  height: 100px;
  background-image: url("./img/bg_box_360x100.png");
  background-size: 100% 100%;
}
.box-380x126 {
  width: 380px;
  height: 126px;
  background-image: url("./img/bg_box_380x126.png");
  background-size: 100% 100%;
}
.screen-wrapper {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 0.5s;
  position: relative;
  overflow: hidden;
  z-index: 100;
  transform-origin: left top;
}
.box-440x100 {
  width: 440px;
  background-image: url("./img/bg_box_440x100.png");
}
.box-440x100,
.box-520x100 {
  height: 100px;
  background-size: 100% 100%;
}
.box-520x100 {
  width: 520px;
  background-image: url("./img/bg_box_520x100.png");
}
.scale-wrap {
  width: 1920px;
  height: 1080px;
  color: rgb(211, 214, 221);
  overflow: hidden;
  background: rgba(220, 241, 238, 0.75);
}
.scale-wrap .layout-container {
  width: 100%;
  height: 100%;
  padding: 0px;
}
.scale-wrap .layout-body {
  width: 100%;
  height: 100%;
  position: relative;
}
.scale-wrap .layout-body .layout-title {
  width: 100%;
  height: 103px;
  position: relative;
  z-index: 99;
  background-size: 1798px 103px;
  background-repeat: no-repeat;
  background-position: 50% center;
  display: flex;
  justify-content: center;
}
.scale-wrap .layout-body .layout-title .btn-setting {
  position: absolute;
  width: 100px;
  height: 100px;
  top: 0px;
  right: 0px;
  opacity: 0;
}
.scale-wrap .layout-body .layout-title .title-text-1 {
  width: 120px;
  height: 27px;
  font-size: 22px;
  font-family: jianti, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-weight: 400;
  color: rgb(232, 255, 248);
  line-height: 27px;
  letter-spacing: 1px;
  text-shadow: rgb(15, 162, 130) 0px 3px 4px;
  cursor: pointer;
  text-align: right;
  padding-top: 12px;
}
.scale-wrap .layout-body .layout-title .title-text-2 {
  width: 360px;
  font-size: 36px;
  font-family: jianti, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-weight: 400;
  color: rgb(255, 255, 255);
  line-height: 44px;
  letter-spacing: 1px;
  text-shadow: rgb(15, 162, 130) 0px 3px 4px;
  text-align: center;
  cursor: pointer;
  margin: 0px 150px;
  padding-top: 11px;
}
.scale-wrap .layout-body .layout-title .title-text-3 {
  width: 120px;
  height: 27px;
  font-size: 22px;
  font-family: jianti, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-weight: 400;
  color: rgb(232, 255, 248);
  line-height: 27px;
  letter-spacing: 1px;
  text-shadow: rgb(15, 162, 130) 0px 3px 4px;
  cursor: pointer;
  text-align: left;
  padding-top: 12px;
}
.assets-container {
  width: 100%;
  height: 977px;
  animation: 2s ease 0s 1 normal none running v-fade-out-7ac07be0;
  position: relative;
  display: flex;
  padding: 0px 44px;
}
.assets-container .border-left {
  position: absolute;
  left: 0px;
  top: 0px;
}
.assets-container .border-right {
  position: absolute;
  right: 0px;
  top: 0px;
}
.assets-container .border-bottom {
  position: absolute;
  left: 60.5px;
  bottom: -40px;
}
.assets-container .box-1 {
  width: 340px;
  height: 883px;
  padding: 30px;
  flex-shrink: 0;
  position: relative;
}
.assets-container .box-1::after {
  content: " ";
  width: 100%;
  height: 100%;
  background: rgb(255, 255, 255);
  opacity: 0.35;
  display: block;
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 15px;
  z-index: -1;
}
.assets-container .box-1 .box-1-1 .box-1-1-1 {
  height: 36px;
  color: rgb(27, 75, 64);
  margin-bottom: 30px;
}
.assets-container .box-1 .box-1-1 .box-1-1-2 {
  margin-bottom: 60px;
}
.assets-container .box-1 .box-1-1 .box-1-1-2 div:first-child {
  height: 20px;
  font-size: 20px;
  font-weight: 600;
  color: rgb(22, 149, 113);
  line-height: 20px;
  margin-bottom: 14px;
}
.assets-container .box-1 .box-1-1 .box-1-1-2 div:last-child {
  height: 48px;
  font-size: 48px;
  font-family: DIN, "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif;
  font-weight: 900;
  color: rgb(22, 149, 113);
  line-height: 48px;
}
.assets-container .box-1 .box-1-2 {
  display: flex;
  flex-direction: column;
}
.assets-container .box-1 .box-1-2 .jiantangongxian {
  width: 100%;
  height: 330px;
}
.assets-container .box-2 {
  flex: 1 1 auto;
  height: 883px;
  background-image: url("./img/bg_assets.png");
  background-size: 1577px 720px;
  background-repeat: no-repeat;
  background-position: -60px 90px;
  position: relative;
}
.assets-container .box-2 .box-2-1 {
  position: absolute;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
}
.assets-container .box-2 .box-2-1 .box-2-1-1 {
  margin: 16px auto 24px 0px;
  width: 100%;
  height: 18px;
  font-size: 18px;
  font-weight: 600;
  color: rgb(255, 255, 255);
  line-height: 18px;
  text-align: center;
}
.assets-container .box-2 .box-2-1 .box-2-1-2 {
  width: 100%;
  margin-left: 17px;
  margin-right: 40px;
  display: flex;
  flex-wrap: wrap;
}
.assets-container .box-2 .box-2-1 .box-2-1-2 div {
  height: 16px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(22, 149, 113);
  line-height: 16px;
  margin-bottom: 10px;
}
.assets-container .box-2 .box-2-1 .box-2-1-2 div:nth-child(2) {
  font-size: 16px;
  font-family: DIN, "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif;
  font-weight: 900;
  color: rgb(255, 115, 0);
  margin-left: auto;
  margin-right: 6px;
}
.assets-container .box-2 .box-2-1 .box-2-1-2 div:nth-child(3) {
  width: 14px;
  white-space: nowrap;
}
.assets-container .box-2 .box-2-1.box-520x100 .box-2-1-2:nth-child(2) {
  width: 40%;
}
.assets-container .box-2 .box-2-1.box-520x100 .box-2-1-2:nth-child(3) {
  width: 40%;
  margin-right: 0px;
}
.assets-container .box-2 .box-2-1.box-440x100 .box-2-1-2:nth-child(2) {
  width: 40%;
  margin-right: 70px;
}
.assets-container .box-2 .box-2-1.box-440x100 .box-2-1-2:nth-child(3) {
  width: 30%;
  margin-right: 0px;
}
.assets-container .box-2 .box-2-1.box-360x145 .box-2-1-2 {
  width: calc(50% - 30px);
  margin-right: 0px;
}
.assets-container .box-2 .box-2-1.box-360x145 .box-2-1-2 div:nth-child(3) {
  width: 28px;
}
.assets-container .box-2 .box-2-1.box-360x100 .box-2-1-2:nth-child(2) {
  width: 40%;
  margin-right: 10px;
}
.assets-container .box-2 .box-2-1.box-360x100 .box-2-1-2:nth-child(3) {
  width: 40%;
  margin-right: 0px;
}
.assets-container .box-2 .box-2-1.box-380x126 .box-2-1-2:nth-child(2),
.assets-container .box-2 .box-2-1.box-380x126 .box-2-1-2:nth-child(3),
.assets-container .box-2 .box-2-1.box-380x126 .box-2-1-2:nth-child(4) {
  width: 44%;
  margin-right: 0px;
}
.assets-container .box-3 {
  position: absolute;
  top: 0px;
  right: 80px;
  width: 250px;
  height: 100px;
}
.assets-container .box-3::after {
  content: " ";
  width: 100%;
  height: 100%;
  background: rgb(255, 255, 255);
  opacity: 0.61;
  display: block;
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  z-index: -1;
}
.assets-container .box-3 img {
  position: absolute;
  top: -20px;
  left: -25px;
  z-index: 2;
}
.assets-container .box-3 div {
  width: 100%;
  height: 14px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(22, 149, 113);
  line-height: 14px;
  text-align: right;
  margin-top: 15px;
  padding-right: 20px;
}
.assets-container .box-3 div.bg-tianqi {
  width: 120px;
  height: 120px;
  background: rgb(255, 255, 255);
  opacity: 0.61;
  border-radius: 50%;
  display: block;
  position: absolute;
  top: -10px;
  left: -20px;
  z-index: 1;
  margin: 0px;
  padding: 0px;
}
.assets-container .box-3 div:last-child {
  height: 32px;
  font-size: 32px;
  font-family: DIN, "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif;
  font-weight: 400;
  color: rgb(22, 149, 113);
  line-height: 32px;
  letter-spacing: 1px;
}

/* ── 复刻时补的样式：减碳贡献图（线上是 ECharts canvas，此处用 SVG 等价实现，见文件头差异 1）── */
.leadership-root {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* 底色按约定用白色：即使缩放留缝也不会像深色那样显眼 */
  background: #ffffff;
}
.leadership-root .screen-wrapper {
  flex: none;
  transform-origin: center center;
}
.contrib-chart {
  display: block;
  width: 100%;
  height: 100%;
}
.contrib-chart .bar-shape {
  fill: rgba(15, 162, 130, 0.9);
  stroke: #4cf5ff;
  stroke-width: 1;
}
.contrib-chart .bar-value {
  fill: #4cf5ff;
  font-size: 12px;
}
.contrib-chart .bar-name {
  fill: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}
</style>
