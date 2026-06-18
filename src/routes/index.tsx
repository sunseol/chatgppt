import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/deck/HomeScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DeckForge - 데스크탑 슬라이드 제작" },
      {
        name: "description",
        content: "인터뷰, 조사, 기획, 디자인, 편집까지 한 화면 흐름으로 진행하는 슬라이드 제작 앱.",
      },
      { property: "og:title", content: "DeckForge - 데스크탑 슬라이드 제작" },
      {
        property: "og:description",
        content: "단계별 확인과 편집 가능한 결과물을 제공하는 데스크탑 슬라이드 제작 앱.",
      },
    ],
  }),
  component: HomeScreen,
});
