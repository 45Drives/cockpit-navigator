import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { Source } from "@/lib/Source";
import { Location } from "@/types/Location";
import { INotifications } from "@/types/Notifications";

export default function useSourceAdapter() {
	let source;
	const items = ref([]);
	const route = useRoute();

	return {
		items
	}
}
