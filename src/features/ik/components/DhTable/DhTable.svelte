<script lang="ts">
	import styles from './DhTable.module.scss';
	import type { TDhField } from '@/features/ik/types';
	import type { TDhJoint, TJointType } from '@/types/kinematics';
	import { degToRad, radToDeg } from '@/utils/kinematics';

	let {
		joints,
		onChange
	}: {
		joints: TDhJoint[];
		onChange: (index: number, joint: TDhJoint) => void;
	} = $props();

	const ANGLE_FIELDS: TDhField[] = ['theta', 'alpha'];

	const displayValue = (joint: TDhJoint, field: TDhField): number => {
		const value = joint[field];
		const shown = ANGLE_FIELDS.includes(field) ? radToDeg(value) : value;
		return Math.round(shown * 1e4) / 1e4;
	};

	const updateField = (index: number, field: TDhField, raw: string) => {
		const parsed = Number.parseFloat(raw);
		if (!Number.isFinite(parsed)) {
			return;
		}
		const value = ANGLE_FIELDS.includes(field) ? degToRad(parsed) : parsed;
		const next: TDhJoint = { ...joints[index] };
		next[field] = value;
		onChange(index, next);
	};

	const updateType = (index: number, type: string) => {
		onChange(index, { ...joints[index], type: type as TJointType });
	};

	const columns: { field: TDhField; label: string; unit: string; step: number }[] = [
		{ field: 'theta', label: 'θ', unit: '°', step: 1 },
		{ field: 'd', label: 'd', unit: 'u', step: 0.05 },
		{ field: 'a', label: 'a', unit: 'u', step: 0.05 },
		{ field: 'alpha', label: 'α', unit: '°', step: 1 }
	];
</script>

<div class={styles.dhTable}>
	<table class={styles.table}>
		<caption class={styles.caption}>
			Standard DH parameters. The joint variable is added to θ (revolute) or d (prismatic).
		</caption>
		<thead>
			<tr>
				<th scope="col">Joint</th>
				<th scope="col">Type</th>
				{#each columns as column (column.field)}
					<th scope="col">{column.label} <span class={styles.unit}>({column.unit})</span></th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each joints as joint, index (index)}
				<tr>
					<th scope="row">{index + 1}</th>
					<td>
						<select
							class={styles.input}
							aria-label={`Joint ${index + 1} type`}
							value={joint.type}
							onchange={(event) => updateType(index, event.currentTarget.value)}
						>
							<option value="revolute">Revolute</option>
							<option value="prismatic">Prismatic</option>
						</select>
					</td>
					{#each columns as column (column.field)}
						<td>
							<input
								class={styles.input}
								type="number"
								step={column.step}
								aria-label={`Joint ${index + 1} ${column.label}`}
								value={displayValue(joint, column.field)}
								onchange={(event) => updateField(index, column.field, event.currentTarget.value)}
							/>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
